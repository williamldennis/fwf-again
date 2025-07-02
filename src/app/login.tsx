export const options = { headerShown: false };


import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { View, TextInput, Button, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { Stack } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

export const unstable_settings = {
    initialRouteName: 'login',
};


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        checkPermissionsAndRedirect();
    }, []);

    const checkPermissionsAndRedirect = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Fetch user profile from Supabase
            const user = session.user;
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('contacts_approved, location_approved, selfie_urls')
                .eq('id', user.id)
                .single();
            if (error || !profile) {
                alert('Could not fetch user profile.');
                return;
            }

            if (!profile.contacts_approved) {
                router.replace('/contacts-permission');
            } else if (!profile.location_approved) {
                router.replace('/location-permission');
            } else {
                const requiredSelfies = ['sunny', 'cloudy', 'rainy', 'snowy', 'thunderstorm'];
                const selfies = profile.selfie_urls || {};
                const hasAllSelfies = requiredSelfies.every(key => selfies[key]);
                if (!hasAllSelfies) {
                    router.replace('/selfie');
                } else {
                    router.replace('/home');
                }
            }
        }
    };

    const signIn = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
        } else {
            checkPermissionsAndRedirect();
        }
    };

    const signUp = async () => {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } });
        if (error) {
            alert(error.message);
        } else {
            console.log('signUp', error);
            router.replace('/phone-number-add');
        }
    };

    return (
        <>
        <View style={{ flex: 1 }}>
            <Video
                source={require('../../assets/videos/login-bg.mp4')}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
            />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={64}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View>
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Image
                                source={require('../../assets/images/lock-up.png')}
                                style={{ width: 260, height: 260, resizeMode: 'contain', marginBottom: 16 }}
                                accessibilityLabel="Fair Weather Friends logo"
                            />
                        </View>
                        <TextInput
                            className="p-5 mb-5 text-base rounded-xl border border-gray-300"
                            placeholder="email"
                            autoCapitalize="none"
                            onChangeText={setEmail}
                            value={email}
                        />
                        <TextInput
                            className="p-5 mb-5 text-base rounded-xl border border-gray-300"
                            placeholder="password"
                            secureTextEntry
                            onChangeText={setPassword}
                            value={password}
                        />
                        <View style={{ width: '100%' }}>
                            {/* Sign Up Button: Gold, 50% opacity, blur */}
                            <View style={{
                                marginBottom: 12,
                                borderRadius: 8,
                                overflow: 'hidden',
                            }}>
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: '#FFD700', // Gold
                                    opacity: 0.5,
                                }} />
                                {/* If expo-blur is available, wrap in BlurView for extra blur effect */}
                                {/* <BlurView intensity={30} style={StyleSheet.absoluteFill} /> */}
                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 16,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                    }}
                                    onPress={signUp}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Sign In Button: White, 50% opacity, blur */}
                            <View style={{
                                borderRadius: 8,
                                overflow: 'hidden',
                            }}>
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: '#fff',
                                    opacity: 0.5,
                                }} />
                                {/* <BlurView intensity={30} style={StyleSheet.absoluteFill} /> */}
                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 16,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                    }}
                                    onPress={signIn}
                                >
                                    <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
        </>
    );
}
