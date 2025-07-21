import * as Contacts from "expo-contacts";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { supabase } from "../utils/supabase";
import { WeatherService } from "./weatherService";
import { logMessage, logError, addBreadcrumb } from "../utils/sentry";

export interface Contact {
    contact_phone: string;
    contact_name: string;
}

export interface Friend {
    id: string;
    phone_number: string;
    weather_temp: number;
    weather_condition: string;
    weather_icon: string;
    weather_updated_at: string;
    latitude: number;
    longitude: number;
    selfie_urls: any;
    points: number;
    current_level: number;
    total_xp: number;
    contact_name: string;
    city_name: string;
}

export class ContactsService {
    /**
     * Refresh contacts from device and save to database
     */
    static async refreshContacts(): Promise<{ success: boolean; contactCount: number; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, contactCount: 0, error: "Could not get user info." };
            }

            // Fetch user's country code from profile (default to 'US')
            let userCountryCode: CountryCode = "US" as CountryCode;
            const { data: profile } = await supabase
                .from("profiles")
                .select("country_code")
                .eq("id", user.id)
                .single();
            if (profile && profile.country_code) {
                userCountryCode = profile.country_code as CountryCode;
            }

            // Get contacts from device
            let contacts;
            try {
                const contactsResult = await Contacts.getContactsAsync({
                    fields: [
                        Contacts.Fields.PhoneNumbers,
                        Contacts.Fields.Name,
                    ],
                });
                contacts = contactsResult.data;
            } catch (contactsError) {
                return { 
                    success: false, 
                    contactCount: 0, 
                    error: "Could not access contacts. Please check your permissions." 
                };
            }

            if (!contacts || contacts.length === 0) {
                return { success: false, contactCount: 0, error: "No contacts found on your device." };
            }

            // Process contacts and normalize phone numbers
            const rows = this.processContacts(contacts, userCountryCode);
            console.log(`Processing ${rows.length} valid phone numbers from ${contacts.length} contacts`);

            // Save to database
            const saveResult = await this.saveContactsToDatabase(user.id, rows);
            if (!saveResult.success) {
                return { success: false, contactCount: 0, error: saveResult.error };
            }

            // Update profile with new contact count
            try {
                await supabase
                    .from("profiles")
                    .update({ contacts_count: contacts.length })
                    .eq("id", user.id);
            } catch (updateError) {
                console.warn("Could not update contact count:", updateError);
            }

            return { success: true, contactCount: contacts.length };
        } catch (error) {
            return { 
                success: false, 
                contactCount: 0, 
                error: "Failed to refresh contacts. Please try again." 
            };
        }
    }

    /**
     * Process contacts and normalize phone numbers to E.164 format
     */
    private static processContacts(contacts: any[], userCountryCode: CountryCode): Contact[] {
        const rows: Contact[] = [];
        
        contacts.forEach((contact) => {
            (contact.phoneNumbers || []).forEach((pn: any) => {
                if (pn.number) {
                    // Normalize to E.164 using libphonenumber-js
                    let e164 = null;
                    try {
                        const phoneNumber = parsePhoneNumberFromString(
                            pn.number,
                            userCountryCode
                        );
                        if (phoneNumber && phoneNumber.isValid()) {
                            e164 = phoneNumber.number; // E.164 format
                        }
                    } catch (e) {
                        // Ignore invalid numbers
                    }
                    if (e164) {
                        rows.push({
                            contact_phone: e164,
                            contact_name: contact.name,
                        });
                    }
                }
            });
        });

        return rows;
    }

    /**
     * Save contacts to database with batching
     */
    private static async saveContactsToDatabase(userId: string, contacts: Contact[]): Promise<{ success: boolean; error?: string }> {
        try {
            // Clear old contacts
            const { error: deleteError } = await supabase
                .from("user_contacts")
                .delete()
                .eq("user_id", userId);
            if (deleteError) {
                console.warn("Could not clear old contacts:", deleteError);
            }

            // Insert new contacts in batches
            const BATCH_SIZE = 200;
            for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
                const batch = contacts.slice(i, i + BATCH_SIZE);
                const { error } = await supabase
                    .from("user_contacts")
                    .insert(batch);
                if (error) {
                    console.error("Batch insert error:", error);
                    return { 
                        success: false, 
                        error: "Some contacts may not have been saved. Please try again." 
                    };
                }
            }

            return { success: true };
        } catch (dbError) {
            console.error("Database operation failed:", dbError);
            return { 
                success: false, 
                error: "Failed to save contacts. Please check your internet connection and try again." 
            };
        }
    }

    /**
     * Fetch user's contacts from database
     */
    static async fetchUserContacts(userId: string): Promise<Contact[]> {
        let allContacts: Contact[] = [];
        let from = 0;
        const pageSize = 1000;

        while (true) {
            const { data: contacts, error: contactsError } = await supabase
                .from("user_contacts")
                .select("contact_phone, contact_name")
                .eq("user_id", userId)
                .range(from, from + pageSize - 1);
            
            if (contactsError) {
                console.error("Contacts fetch error:", contactsError);
                throw new Error("Failed to fetch contacts.");
            }
            
            if (!contacts || contacts.length === 0) {
                break; // No more data
            }
            
            allContacts = allContacts.concat(contacts);
            from += pageSize;
            
            // If we got less than pageSize, we're done
            if (contacts.length < pageSize) {
                break;
            }
        }

        return allContacts;
    }

    /**
     * Find friends from user's contacts
     */
    static async findFriendsFromContacts(contacts: Contact[], currentUserId: string): Promise<Friend[]> {
        logMessage("Starting friend discovery from contacts", "info", { 
            currentUserId, 
            contactCount: contacts.length 
        });
        addBreadcrumb("Friend discovery started", "friends", { currentUserId, contactCount: contacts.length });
        
        // Create a mapping of E.164 phone numbers to contact names
        const phoneToNameMap = new Map<string, string>();
        contacts.forEach((contact) => {
            phoneToNameMap.set(contact.contact_phone, contact.contact_name);
        });

        const contactPhones = contacts.map((c) => c.contact_phone);
        const uniquePhones = Array.from(new Set(contactPhones));
        console.log(`Unique phone numbers: ${uniquePhones.length}`);
        logMessage("Processing unique phone numbers", "info", { 
            currentUserId, 
            uniquePhoneCount: uniquePhones.length,
            samplePhones: uniquePhones.slice(0, 3) // Log first 3 for debugging
        });

        // Batch into chunks of 500
        const BATCH_SIZE = 500;
        const phoneChunks = this.chunkArray<string>(uniquePhones, BATCH_SIZE);
        console.log(`Batching into ${phoneChunks.length} chunks...`);
        logMessage("Batching phone numbers for database query", "info", { 
            currentUserId, 
            batchCount: phoneChunks.length,
            batchSize: BATCH_SIZE
        });

        // Parallelize the queries
        console.log("Searching for friends in database...");
        logMessage("Querying database for friends", "info", { currentUserId, batchCount: phoneChunks.length });
        
        try {
            const friendResults = await Promise.all(
                phoneChunks.map((chunk, index) => {
                    logMessage(`Querying batch ${index + 1}/${phoneChunks.length}`, "info", { 
                        currentUserId, 
                        batchIndex: index,
                        batchSize: chunk.length 
                    });
                    return supabase
                        .from("profiles")
                        .select(
                            "id, phone_number, weather_temp, weather_condition, weather_icon, weather_updated_at, latitude, longitude, selfie_urls, points, current_level, total_xp"
                        )
                        .in("phone_number", chunk);
                })
            );

            let allFriends: any[] = [];
            for (const result of friendResults) {
                if (result.data) allFriends = allFriends.concat(result.data);
            }

            logMessage("Database query completed", "info", { 
                currentUserId, 
                totalFriendsFound: allFriends.length,
                friendIds: allFriends.map(f => f.id)
            });

            // Remove the current user from the results
            const filteredFriends = allFriends.filter((f) => f.id !== currentUserId);
            console.log(`Filtered friends (excluding self): ${filteredFriends.length}`);
            logMessage("Filtered friends (excluding self)", "info", { 
                currentUserId, 
                filteredCount: filteredFriends.length,
                filteredIds: filteredFriends.map(f => f.id)
            });

            // Add contact names, city names, and fresh weather data to the friends data
            // Use staggered approach instead of Promise.all to prevent API overload
            console.log("[Friends] 🌤️ Starting staggered weather updates for friends...");
            logMessage("Starting weather updates for friends", "info", { 
                currentUserId, 
                friendCount: filteredFriends.length 
            });
            
            const friendsWithNamesCitiesAndWeather: Friend[] = [];
            
            for (const friend of filteredFriends) {
                const contactName = phoneToNameMap.get(friend.phone_number);
                let cityName = "Unknown";
                let freshWeather = null;

                logMessage(`Processing friend: ${contactName}`, "info", { 
                    currentUserId, 
                    friendId: friend.id,
                    friendPhone: friend.phone_number,
                    hasLocation: !!(friend.latitude && friend.longitude)
                });

                if (friend.latitude && friend.longitude) {
                    // Get city name
                    try {
                        cityName = await WeatherService.getCityFromCoords(
                            friend.latitude,
                            friend.longitude
                        );
                        logMessage(`Got city name for ${contactName}`, "info", { 
                            currentUserId, 
                            friendId: friend.id,
                            cityName 
                        });
                    } catch (cityError) {
                        console.warn(`[Friends] ⚠️ Could not get city name for ${contactName}:`, cityError);
                        logError(cityError as Error, { 
                            currentUserId, 
                            friendId: friend.id,
                            operation: "getCityName",
                            errorType: "city_lookup_error"
                        });
                    }

                    // Get fresh weather data using friend's stored location
                    try {
                        console.log(`[Friends] 🌤️ Fetching fresh weather for ${contactName} at ${friend.latitude}, ${friend.longitude}`);
                        logMessage(`Fetching weather for ${contactName}`, "info", { 
                            currentUserId, 
                            friendId: friend.id,
                            latitude: friend.latitude,
                            longitude: friend.longitude
                        });
                        
                        freshWeather = await WeatherService.fetchWeatherData(
                            friend.latitude,
                            friend.longitude
                        );
                        console.log(`[Friends] ✅ Fresh weather fetched for ${contactName}: ${freshWeather.current.weather[0].main} ${freshWeather.current.main.temp}°F`);
                        
                        logMessage(`Weather fetched for ${contactName}`, "info", { 
                            currentUserId, 
                            friendId: friend.id,
                            weatherCondition: freshWeather.current.weather[0].main,
                            temperature: freshWeather.current.main.temp
                        });
                        
                        // Small delay to avoid overwhelming the API and show progress
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                    } catch (weatherError) {
                        console.warn(`[Friends] ⚠️ Could not fetch fresh weather for ${contactName}, using stored data:`, weatherError);
                        logError(weatherError as Error, { 
                            currentUserId, 
                            friendId: friend.id,
                            operation: "fetchWeather",
                            errorType: "weather_fetch_error"
                        });
                    }
                } else {
                    console.log(`[Friends] ⚠️ No location data for ${contactName}, using stored weather data`);
                    logMessage(`No location data for ${contactName}`, "warning", { 
                        currentUserId, 
                        friendId: friend.id,
                        contactName 
                    });
                }

                friendsWithNamesCitiesAndWeather.push({
                    ...friend,
                    contact_name: contactName || "Unknown",
                    city_name: cityName,
                    // Use fresh weather data if available, otherwise fall back to stored data
                    weather_temp: freshWeather?.current?.main?.temp ?? friend.weather_temp,
                    weather_condition: freshWeather?.current?.weather?.[0]?.main ?? friend.weather_condition,
                    weather_icon: freshWeather?.current?.weather?.[0]?.icon ?? friend.weather_icon,
                    weather_updated_at: freshWeather ? new Date().toISOString() : friend.weather_updated_at,
                });
            }

            console.log(`[Friends] ✅ Completed staggered weather updates for ${friendsWithNamesCitiesAndWeather.length} friends`);
            logMessage("Friend discovery completed", "info", { 
                currentUserId, 
                finalFriendCount: friendsWithNamesCitiesAndWeather.length,
                friendNames: friendsWithNamesCitiesAndWeather.map(f => f.contact_name)
            });
            addBreadcrumb("Friend discovery completed", "friends", { 
                currentUserId, 
                friendCount: friendsWithNamesCitiesAndWeather.length 
            });
            
            return friendsWithNamesCitiesAndWeather;
        } catch (error) {
            logError(error as Error, { 
                currentUserId, 
                operation: "findFriendsFromContacts",
                errorType: "friend_discovery_error"
            });
            throw error;
        }
    }

    /**
     * Utility function to chunk arrays
     */
    private static chunkArray<T>(array: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }
} 