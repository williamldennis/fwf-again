import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import React from 'react';
import { supabase } from '../utils/supabase';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

const getWeatherGradient = (weatherCondition: string) => {
    switch (weatherCondition?.toLowerCase()) {
        case 'clear':
            return ['#FFD700', '#FFA500']; // Yellow to orange
        case 'clouds':
            return ['#E8E8E8', '#B0B0B0']; // Light gray to darker gray
        case 'rain':
            return ['#4A90E2', '#7B68EE']; // Blue to purple
        case 'snow':
            return ['#F0F8FF', '#E6E6FA']; // Light blue to lavender
        case 'thunderstorm':
            return ['#2C3E50', '#34495E']; // Dark blue-gray
        case 'drizzle':
            return ['#87CEEB', '#4682B4']; // Sky blue to steel blue
        case 'mist':
        case 'fog':
            return ['#D3D3D3', '#A9A9A9']; // Light gray to dark gray
        case 'haze':
            return ['#F5F5DC', '#DEB887']; // Beige to burlywood
        default:
            return ['#E8E8E8', '#B0B0B0']; // Default gray
    }
};

const getInitials = (name: string) => {
    if (!name || name === 'Unknown') return '?';
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => {
    const initials = getInitials(name);
    const backgroundColor = name === 'Unknown' ? '#999' : '#007AFF';

    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        }}>
            <Text style={{
                color: 'white',
                fontSize: size * 0.4,
                fontWeight: 'bold',
            }}>
                {initials}
            </Text>
        </View>
    );
};

export default function Home() {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [friendsWeather, setFriendsWeather] = useState<any[]>([]);

    // Logout handler
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Logout failed', error.message);
        } else {
            router.replace('/login');
        }
    };

    useEffect(() => {
        const fetchProfileAndWeather = async () => {
            setLoading(true);
            setError(null);
            // Get user
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                setError('User not found.');
                setLoading(false);
                return;
            }
            // Get profile
            const { data: profile, error: profileError } = await supabase.from('profiles').select('latitude,longitude').eq('id', user.id).single();
            if (profileError || !profile?.latitude || !profile?.longitude) {
                setError('Location not found.');
                setLoading(false);
                return;
            }
            // Fetch weather
            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${profile.latitude}&lon=${profile.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                setWeather(data);
                // Update user's weather in Supabase
                await supabase.from('profiles').update({
                    weather_temp: data.main.temp,
                    weather_condition: data.weather[0].main,
                    weather_icon: data.weather[0].icon,
                    weather_updated_at: new Date().toISOString(),
                }).eq('id', user.id);

                // Fetch user's contacts with pagination
                let allContacts: any[] = [];
                let from = 0;
                const pageSize = 1000;

                while (true) {
                    const { data: contacts, error: contactsError } = await supabase
                        .from('user_contacts')
                        .select('contact_phone, contact_name')
                        .eq('user_id', user.id)
                        .range(from, from + pageSize - 1);

                    if (contactsError) {
                        setError('Failed to fetch contacts.');
                        setLoading(false);
                        return;
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

                console.log('Raw contacts from database (with pagination):', allContacts);
                console.log('Total contacts retrieved:', allContacts.length);

                // Create a mapping of cleaned phone numbers to contact names
                const phoneToNameMap = new Map<string, string>();
                allContacts.forEach((contact: any) => {
                    const cleanedPhone = String(contact.contact_phone).replace(/[^0-9]/g, '');
                    phoneToNameMap.set(cleanedPhone, contact.contact_name);
                });

                const contactPhones = (allContacts || []).map((c: any) => c.contact_phone);
                // Force all numbers to be clean digit-only strings
                const cleanedPhones = contactPhones.map(p => String(p).replace(/[^0-9]/g, ''));
                const uniquePhones = Array.from(new Set(cleanedPhones));

                console.log('Total contacts:', allContacts.length);
                console.log('Total cleanedPhones:', cleanedPhones.length);
                console.log('Total uniquePhones:', uniquePhones.length);

                // Check if John's number is in the contacts
                const johnInContacts = uniquePhones.includes('13032224444');
                console.log('John\'s number in contacts:', johnInContacts);
                if (johnInContacts) {
                    console.log('John\'s contact found in database!');
                } else {
                    console.log('John\'s contact NOT found in database. Available numbers:', uniquePhones.filter(p => p.includes('130322')));
                }

                console.log('Unique cleaned contact phones:', uniquePhones);
                console.log('Does uniquePhones include John (11 digits)?', uniquePhones.includes('13032224444'));
                console.log('Does uniquePhones include John (10 digits)?', uniquePhones.includes('1303222444'));
                // Batch into chunks of 500
                function chunkArray<T>(array: T[], size: number): T[][] {
                    const result: T[][] = [];
                    for (let i = 0; i < array.length; i += size) {
                        result.push(array.slice(i, i + size));
                    }
                    return result;
                }
                const BATCH_SIZE = 500;
                const phoneChunks = chunkArray<string>(uniquePhones, BATCH_SIZE);
                console.log('Phone chunks:', phoneChunks);
                // Log each phone number in the first chunk
                phoneChunks[0].forEach((num: string, idx: number) => {
                    console.log(`Chunk 1 phone ${idx}:`, num, typeof num, JSON.stringify(num));
                });
                // Direct comparison logs for John's number
                console.log('Does chunk include John exactly?', phoneChunks[0].includes('13032224444'));
                console.log('Index of John in chunk:', phoneChunks[0].indexOf('13032224444'));
                console.log('John in chunk (as string):', phoneChunks[0].find(num => num == '13032224444'));
                console.log('John in chunk (strict):', phoneChunks[0].find(num => num === '13032224444'));
                // Check for hidden characters in John's number
                phoneChunks[0].forEach((num, idx) => {
                    if (num.includes('13031111111')) {
                        console.log(`Potential John match at index ${idx}:`, num, num.length, JSON.stringify(num));
                        for (let i = 0; i < num.length; i++) {
                            console.log(`Char ${i}:`, num.charCodeAt(i));
                        }
                    }
                });

                // Test batch query with only John's number
                const { data: johnBatch, error: johnBatchError } = await supabase
                    .from('profiles')
                    .select('id, phone_number, email')
                    .in('phone_number', ['13032224444']);
                console.log('Batch query with only John:', johnBatch, johnBatchError);

                // Test batch query with only your number
                const { data: meBatch, error: meBatchError } = await supabase
                    .from('profiles')
                    .select('id, phone_number, email')
                    .in('phone_number', ['13033595357']);
                console.log('Batch query with only me:', meBatch, meBatchError);

                // Test batch query with both numbers
                const { data: bothBatch, error: bothBatchError } = await supabase
                    .from('profiles')
                    .select('id, phone_number, email')
                    .in('phone_number', ['13033595357', '13032224444']);
                console.log('Batch query with both:', bothBatch, bothBatchError);

                // Parallelize the queries
                const friendResults = await Promise.all(
                    phoneChunks.map((chunk, idx) => {
                        console.log(`Querying chunk ${idx + 1}/${phoneChunks.length}:`, chunk);
                        return supabase
                            .from('profiles')
                            .select('id, phone_number, weather_temp, weather_condition, weather_icon, weather_updated_at')
                            .in('phone_number', chunk)
                            .then(result => {
                                console.log(`Result for chunk ${idx + 1}:`, result.data);
                                return result;
                            });
                    })
                );
                let allFriends: any[] = [];
                for (const result of friendResults) {
                    if (result.data) allFriends = allFriends.concat(result.data);
                }
                console.log('All friends combined:', allFriends);
                // Remove the current user from the results
                const filteredFriends = allFriends.filter(f => f.id !== user.id);

                // Add contact names to the friends data
                const friendsWithNames = filteredFriends.map(friend => {
                    const cleanedPhone = String(friend.phone_number).replace(/[^0-9]/g, '');
                    const contactName = phoneToNameMap.get(cleanedPhone);
                    return {
                        ...friend,
                        contact_name: contactName || 'Unknown'
                    };
                });

                console.log('Friends with names:', friendsWithNames);
                setFriendsWeather(friendsWithNames);
            } catch (err) {
                setError('Failed to fetch weather.');
            }
            setLoading(false);
        };
        fetchProfileAndWeather();
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Weather',
                    headerRight: () => (
                        <Text
                            style={{ marginRight: 16, color: '#007AFF', fontWeight: 'bold' }}
                            onPress={handleLogout}
                        >
                            Logout
                        </Text>
                    ),
                }}
            />
            <View style={{ flex: 1 }}>
                {/* Weather Card */}
                <View
                    style={[
                        styles.card,
                        { backgroundColor: weather ? getWeatherGradient(weather.weather[0].main)[0] : '#E8E8E8' }
                    ]}
                >
                    {loading ? (
                        <View style={styles.center}><ActivityIndicator size="large" /><Text style={{ color: '#000' }}>Loading weather...</Text></View>
                    ) : error ? (
                        <View style={styles.center}><Text style={{ color: '#000' }}>{error}</Text></View>
                    ) : weather ? (
                        <>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000' }}>Current Weather</Text>
                            <Text style={{ fontSize: 16, color: '#666', marginTop: 4 }}>{weather.name}</Text>
                            <Text style={{ fontSize: 48, fontWeight: '300', marginVertical: 10, color: '#000' }}>{Math.round(weather.main.temp)}°</Text>
                            <Text style={{ fontSize: 16, color: '#000' }}>{weather.weather[0].main}</Text>
                        </>
                    ) : null}
                </View>

                {/* Friends List */}
                <ScrollView style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', margin: 16 }}>Friends' Weather</Text>
                    {friendsWeather.length === 0 ? (
                        <Text style={{ marginLeft: 16, color: '#888' }}>No friends using the app yet.</Text>
                    ) : (
                        friendsWeather.map((friend, idx) => (
                            <View
                                key={friend.id || idx}
                                style={[styles.friendCard, { backgroundColor: getWeatherGradient(friend.weather_condition)[0] }]}
                            >
                                <Avatar name={friend.contact_name || 'Unknown'} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#000' }}>{friend.contact_name || 'Unknown'}</Text>
                                    <Text style={{ color: '#666', fontSize: 12 }}>
                                        {friend.weather_updated_at ? `Updated: ${new Date(friend.weather_updated_at).toLocaleTimeString()}` : 'No weather yet'}
                                    </Text>
                                </View>
                                {friend.weather_temp !== null && friend.weather_condition ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 20, color: '#000' }}>{Math.round(friend.weather_temp)}°</Text>
                                        <Text style={{ fontSize: 14, color: '#000' }}>{friend.weather_condition}</Text>
                                        {friend.weather_icon && (
                                            <Text style={{ fontSize: 18 }}>{friend.weather_icon}</Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={{ color: '#888' }}>No weather</Text>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 20,
        margin: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        alignItems: 'center',
    },
    friendCard: {
        flexDirection: 'row',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});