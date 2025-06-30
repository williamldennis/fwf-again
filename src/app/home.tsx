import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import React from 'react';
import { supabase } from '../utils/supabase';

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

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

                // Fetch user's contacts
                const { data: contacts, error: contactsError } = await supabase
                    .from('user_contacts')
                    .select('contact_phone')
                    .eq('user_id', user.id);
                if (contactsError) {
                    setError('Failed to fetch contacts.');
                    setLoading(false);
                    return;
                }
                const contactPhones = (contacts || []).map((c: any) => c.contact_phone);
                console.log('Contact phones:', contactPhones);
                if (contactPhones.length === 0) {
                    setFriendsWeather([]);
                    setLoading(false);
                    return;
                }
                // Fetch friends' profiles (contacts who are users)
                const { data: friends, error: friendsError } = await supabase
                    .from('profiles')
                    .select('id, phone_number, weather_temp, weather_condition, weather_icon, weather_updated_at')
                    .in('phone_number', contactPhones);
                console.log('Current user:', user);
                console.log('Friends from Supabase:', friends);
                if (friendsError) {
                    setError('Failed to fetch friends.');
                    setLoading(false);
                    return;
                }
                const filteredFriends = (friends || []).filter(f => f.id !== user.id);
                console.log('Filtered friendsWeather:', filteredFriends);
                setFriendsWeather(filteredFriends);
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
                <View style={styles.card}>
                    {loading ? (
                        <View style={styles.center}><ActivityIndicator size="large" /><Text>Loading weather...</Text></View>
                    ) : error ? (
                        <View style={styles.center}><Text>{error}</Text></View>
                    ) : weather ? (
                        <>
                            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Current Weather</Text>
                            <Text style={{ fontSize: 16, color: '#666', marginTop: 4 }}>{weather.name}</Text>
                            <Text style={{ fontSize: 48, fontWeight: '300', marginVertical: 10 }}>{Math.round(weather.main.temp)}°</Text>
                            <Text style={{ fontSize: 16 }}>{weather.weather[0].main}</Text>
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
                            <View key={friend.id || idx} style={{
                                flexDirection: 'row',
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#eee',
                                alignItems: 'center',
                            }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '500' }}>{friend.phone_number}</Text>
                                    <Text style={{ color: '#666', fontSize: 12 }}>
                                        {friend.weather_updated_at ? `Updated: ${new Date(friend.weather_updated_at).toLocaleTimeString()}` : 'No weather yet'}
                                    </Text>
                                </View>
                                {friend.weather_temp !== null && friend.weather_condition ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 20 }}>{Math.round(friend.weather_temp)}°</Text>
                                        <Text style={{ fontSize: 14 }}>{friend.weather_condition}</Text>
                                        {friend.weather_icon && (
                                            <Text style={{ fontSize: 18 }}>{friend.weather_icon}</Text>
                                            // You can use an <Image> here if you want to show the icon
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
        backgroundColor: '#fff',
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});