import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, Image, TouchableOpacity, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import React from 'react';
import LottieView from 'lottie-react-native';
import { supabase } from '../utils/supabase';
import { useHeaderHeight } from '@react-navigation/elements';
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';

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
        <View 
            className="justify-center items-center mr-3"
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor,
            }}
        >
            <Text 
                className="font-bold text-white"
                style={{
                    fontSize: size * 0.4,
                }}
            >
                {initials}
            </Text>
        </View>
    );
};

// Add this function to map weather to selfie key
const mapWeatherToSelfieKey = (weather: string) => {
    switch (weather?.toLowerCase()) {
        case 'clear':
            return 'sunny';
        case 'clouds':
            return 'cloudy';
        case 'rain':
        case 'drizzle':
        case 'mist':
        case 'fog':
        case 'haze':
            return 'rainy';
        case 'snow':
            return 'snowy';
        case 'thunderstorm':
            return 'thunderstorm';
        default:
            return 'sunny';
    }
};

// Add Lottie animation mapping
const getWeatherLottie = (weatherCondition: string) => {
    switch (weatherCondition?.toLowerCase()) {
        case 'clear':
            return require('../../assets/lottie/sunny.json');
        case 'clouds':
            return require('../../assets/lottie/cloudy.json');
        case 'rain':
        case 'drizzle':
        case 'mist':
        case 'fog':
        case 'haze':
            return require('../../assets/lottie/rainy.json');
        case 'snow':
            return require('../../assets/lottie/snowy.json');
        case 'thunderstorm':
            return require('../../assets/lottie/thunderstorm.json');
        default:
            return require('../../assets/lottie/sunny.json');
    }
};

function getWeatherDescription(condition: string) {
    switch (condition.toLowerCase()) {
        case 'clear':
            return 'clear';
        case 'clouds':
            return 'cloudy';
        case 'rain':
            return 'rainy';
        case 'snow':
            return 'snowy';
        case 'thunderstorm':
            return 'stormy';
        case 'drizzle':
            return 'drizzly';
        case 'mist':
        case 'fog':
            return 'foggy';
        case 'haze':
            return 'hazy';
        default:
            return condition.toLowerCase();
    }
}

async function getCityFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        const data = await response.json();
        if (data && data[0]) {
            return data[0].name;
        }
        return 'Unknown';
    } catch (error) {
        console.error('Error fetching city name:', error);
        return 'Unknown';
    }
}

function getBackgroundColor(hour: number) {
    if (hour >= 6 && hour < 9) return '#FFA500'; // Sunrise orange
    if (hour >= 9 && hour < 18) return '#87CEEB'; // Day blue
    if (hour >= 18 && hour < 21) return '#FF8C00'; // Sunset orange
    return '#191970'; // Night blue
}

export default function Home() {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [friendsWeather, setFriendsWeather] = useState<any[]>([]);
    const [selfieUrls, setSelfieUrls] = useState<Record<string, string> | null>(null);
    const [bgColor, setBgColor] = useState('#87CEEB');
    const [showMenu, setShowMenu] = useState(false);
    const headerHeight = useHeaderHeight();

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
            try {
                console.log('Starting fetchProfileAndWeather...');
                // Get user
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                console.log('User session:', user ? 'Found' : 'Not found');
                if (!user) {
                    setError('User not found.');
                    setLoading(false);
                    return;
                }
                // Get profile (add selfie_urls to select)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('latitude,longitude,selfie_urls')
                    .eq('id', user.id)
                    .single();
                console.log('Profile fetch result:', { profile, error: profileError });
                if (profileError) {
                    console.error('Profile error:', profileError);
                    setError(`Profile error: ${profileError.message}`);
                    setLoading(false);
                    return;
                }
                if (!profile?.latitude || !profile?.longitude) {
                    console.log('Missing location data:', { latitude: profile?.latitude, longitude: profile?.longitude });
                    setError('Location not found.');
                    setLoading(false);
                    return;
                }
                setSelfieUrls(profile.selfie_urls || null);
                // Get user's timezone and local hour
                let localHour = 12;
                try {
                    const timezone = tzlookup(profile.latitude, profile.longitude);
                    const localTime = DateTime.now().setZone(timezone);
                    localHour = localTime.hour;
                } catch (e) {
                    console.warn('Could not determine timezone from lat/lon', e);
                }
                setBgColor(getBackgroundColor(localHour));
                // Check if OpenWeather API key is available
                if (!OPENWEATHER_API_KEY) {
                    console.error('OpenWeather API key is missing');
                    setError('Weather API key not configured.');
                    setLoading(false);
                    return;
                }
                // Fetch weather
                console.log('Fetching weather data...');
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${profile.latitude}&lon=${profile.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
                console.log('Weather API URL:', url);
                const response = await fetch(url);
                const data = await response.json();
                console.log('Weather API response:', data);
                if (data.cod && data.cod !== 200) {
                    throw new Error(`Weather API error: ${data.message}`);
                }
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
                        console.error('Contacts fetch error:', contactsError);
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
                // Parallelize the queries
                const friendResults = await Promise.all(
                    phoneChunks.map((chunk, idx) => {
                        console.log(`Querying chunk ${idx + 1}/${phoneChunks.length}:`, chunk);
                        return supabase
                            .from('profiles')
                            .select('id, phone_number, weather_temp, weather_condition, weather_icon, weather_updated_at, latitude, longitude')
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
                // Add contact names and city names to the friends data
                const friendsWithNamesAndCities = await Promise.all(
                    filteredFriends.map(async (friend) => {
                        const cleanedPhone = String(friend.phone_number).replace(/[^0-9]/g, '');
                        const contactName = phoneToNameMap.get(cleanedPhone);
                        let cityName = 'Unknown';
                        if (friend.latitude && friend.longitude) {
                            cityName = await getCityFromCoords(friend.latitude, friend.longitude);
                        }
                        return {
                            ...friend,
                            contact_name: contactName || 'Unknown',
                            city_name: cityName
                        };
                    })
                );
                console.log('Friends with names and cities:', friendsWithNamesAndCities);
                setFriendsWeather(friendsWithNamesAndCities);
            } catch (err) {
                console.error('Weather fetch error:', err);
                setError(`Failed to fetch weather: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndWeather();
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => setShowMenu(true)}
                            className="p-2 ml-4"
                        >
                            <Text style={{ fontSize: 24, opacity: 0.5 }}>☰</Text>
                        </TouchableOpacity>
                    ),
                }}
            />
            <View className="flex-1" style={{ paddingTop: headerHeight - 30, backgroundColor: bgColor }}>
                {/* Weather Card */}
                <View
                    className="items-center p-5 m-4 rounded-xl"
                >
                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" />
                            <Text className="text-black">Loading weather...</Text>
                        </View>
                    ) : error ? (
                        <View className="flex-1 justify-center items-center">
                            <Text className="text-black">{error}</Text>
                        </View>
                    ) : weather ? (
                        <>
                            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
                                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Lottie animation (unchanged) */}
                                    <LottieView
                                        source={getWeatherLottie(weather.weather[0].main)}
                                        autoPlay
                                        loop
                                        style={{
                                            width: 800,
                                            height: 800,
                                            position: 'absolute',
                                            zIndex: 4,
                                            opacity: 0.8,
                                            marginTop: 200,
                                        }}
                                    />
                                    {/* Temperature in large white circle */}
                                    <View
                                        style={{
                                            width: 140,
                                            height: 140,
                                            borderRadius: 70,
                                            backgroundColor: '#fff',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2,
                                            shadowColor: '#000',
                                            shadowOpacity: 0.1,
                                            shadowRadius: 8,
                                            elevation: 4,
                                        }}
                                    >
                                        <Text style={{ fontSize: 56, fontWeight: 'bold', color: '#222' }}>
                                            {Math.round(weather.main.temp)}°
                                        </Text>
                                    </View>
                                    {/* User's selfie, smaller, bottom right, overlapping */}
                                    <Image
                                        source={{
                                            uri:
                                                selfieUrls && mapWeatherToSelfieKey(weather.weather[0].main)
                                                    ? selfieUrls[mapWeatherToSelfieKey(weather.weather[0].main)]
                                                    : undefined,
                                        }}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 32,
                                            resizeMode: 'cover',
                                            position: 'absolute',
                                            right: -20,
                                            bottom: -20,
                                            borderWidth: 0,
                                            borderColor: '#fff',
                                            zIndex: 3,
                                            backgroundColor: '#eee',
                                        }}
                                    />
                                </View>
                            </View>
                            <Text className="text-base text-black" style={{ marginTop: 44, textAlign: 'center', fontSize: 18 }}>
                                It&apos;s {getWeatherDescription(weather.weather[0].main)} in {weather.name}
                            </Text>
                        </>
                    ) : null}
                </View>

                {/* Friends List */}
                <ScrollView className="z-10 flex-1">
                    <Text className="m-4 text-xl font-bold">Friends' Weather</Text>
                    {friendsWeather.length === 0 ? (
                        <Text className="ml-4 text-gray-500">No friends using the app yet.</Text>
                    ) : (
                        friendsWeather.map((friend, idx) => (
                            <View
                                key={friend.id || idx}
                                className="flex-row items-center p-4 mx-4 my-2 rounded-xl shadow-sm"
                                style={{ 
                                    backgroundColor: getWeatherGradient(friend.weather_condition)[0],
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 3,
                                    elevation: 3,
                                    zIndex: 5

                    
                                }}
                            >
                                <View className="items-center mr-3">
                                    {/* Friend's weather animation positioned absolutely over avatar */}
                                    {friend.weather_temp !== null && friend.weather_condition ? (
                                        <View style={{ position: 'relative' }}>
                                            <Avatar name={friend.contact_name || 'Unknown'} />
                                            <LottieView
                                                source={getWeatherLottie(friend.weather_condition)}
                                                autoPlay
                                                loop
                                                style={{ 
                                                    width: 40, 
                                                    height: 40, 
                                                    position: 'absolute',
                                                    top: -10,
                                                    left: 0,
                                                    zIndex: 5
                                                }}
                                            />
                                        </View>
                                    ) : (
                                        <Avatar name={friend.contact_name || 'Unknown'} />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-medium text-black">{friend.contact_name || 'Unknown'}</Text>
                                    {friend.weather_temp !== null && friend.weather_condition ? (
                                        <Text className="text-sm text-black">
                                            It&apos;s {getWeatherDescription(friend.weather_condition)} in {friend.city_name}
                                        </Text>
                                    ) : (
                                        <Text className="text-xs text-gray-600">
                                            {friend.weather_updated_at ? `Updated: ${new Date(friend.weather_updated_at).toLocaleTimeString()}` : 'No weather yet'}
                                        </Text>
                                    )}
                                </View>
                                {friend.weather_temp !== null && friend.weather_condition ? (
                                    <View className="items-center">
                                        <Text className="text-xl text-black">{Math.round(friend.weather_temp)}°</Text>
                                    </View>
                                ) : (
                                    <Text className="text-gray-500">No weather</Text>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
            
            {/* Dropdown Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 100, paddingLeft: 20 }}>
                        <View
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 8,
                                padding: 16,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                minWidth: 150,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    router.replace('/selfie');
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#f0f0f0',
                                }}
                            >
                                <Text style={{ fontSize: 16, color: '#333' }}>Retake Selfies</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    handleLogout();
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                }}
                            >
                                <Text style={{ fontSize: 16, color: '#ff4444' }}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}