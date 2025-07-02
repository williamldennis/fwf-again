
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import React from 'react';
import LottieView from 'lottie-react-native';
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

export default function Home() {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [friendsWeather, setFriendsWeather] = useState<any[]>([]);
    const [selfieUrls, setSelfieUrls] = useState<Record<string, string> | null>(null);

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
                        <Text
                            className="ml-4 font-bold text-blue-500"
                            onPress={() => router.replace('/selfie')}
                        >
                            Retake Selfies
                        </Text>
                    ),
                    headerTitle: () => (
                        <Text className="text-lg font-bold text-center text-black">Weather</Text>
                    ),
                    headerRight: () => (
                        <Text
                            className="mr-4 font-bold text-blue-500"
                            onPress={handleLogout}
                        >
                            Logout
                        </Text>
                    ),
                }}
            />
            <View className="flex-1">
                {/* Weather Card */}
                <View
                    className="items-center p-5 m-4 rounded-xl shadow-lg"
                    style={{ 
                        backgroundColor: weather ? getWeatherGradient(weather.weather[0].main)[0] : '#E8E8E8',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}
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
                            <Text className="text-2xl font-bold text-black">Current Weather</Text>
                            <Text className="mt-1 text-base text-gray-600">{weather.name}</Text>
                        
                            
                            {/* Show user's selfie for current weather */}
                            {selfieUrls && (() => {
                                const selfieKey = mapWeatherToSelfieKey(weather.weather[0].main);
                                const selfieData = selfieUrls[selfieKey];
                                if (selfieData) {
                                    return (
                                        <View className="justify-center items-center my-2.5">
                                            {/* Lottie animation overlaid */}
                                            <LottieView
                                                source={getWeatherLottie(weather.weather[0].main)}
                                                autoPlay
                                                loop
                                                style={{ 
                                                    width: 800, 
                                                    height: 800,
                                                    position: 'absolute',
                                                    zIndex: 1,
                                                    opacity: 0.7,
                                                    marginTop: 100,
                                                }}
                                            />
                                            {/* User's selfie */}
                                            <Image
                                                source={{ uri: selfieData }}
                                                style={{ 
                                                    width: 100, 
                                                    height: 100, 
                                                    borderRadius: 50,
                                                    resizeMode: "cover"
                                                }}
                                            />
                                        </View>
                                    );
                                }
                                return null;
                            })()}
                            
                            <Text className="text-5xl font-light my-2.5 text-black">{Math.round(weather.main.temp)}°</Text>
                            <Text className="text-base text-black">{weather.weather[0].main}</Text>
                        </>
                    ) : null}
                </View>

                {/* Friends List */}
                <ScrollView className="flex-1">
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
                                                    zIndex: 2
                                                }}
                                            />
                                        </View>
                                    ) : (
                                        <Avatar name={friend.contact_name || 'Unknown'} />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-medium text-black">{friend.contact_name || 'Unknown'}</Text>
                                    <Text className="text-xs text-gray-600">
                                        {friend.weather_updated_at ? `Updated: ${new Date(friend.weather_updated_at).toLocaleTimeString()}` : 'No weather yet'}
                                    </Text>
                                </View>
                                {friend.weather_temp !== null && friend.weather_condition ? (
                                    <View className="items-center">
                                        <Text className="text-xl text-black">{Math.round(friend.weather_temp)}°</Text>
                                        <Text className="text-sm text-black">{friend.weather_condition}</Text>
                                    </View>
                                ) : (
                                    <Text className="text-gray-500">No weather</Text>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </>
    );
}