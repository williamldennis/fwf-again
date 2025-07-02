import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { View, TextInput, Button, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';

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
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#2563eb', // Tailwind blue-600
                                paddingVertical: 16,
                                borderRadius: 8,
                                marginBottom: 12,
                                alignItems: 'center',
                            }}
                            onPress={signIn}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sign In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#10b981', // Tailwind green-500
                                paddingVertical: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                            }}
                            onPress={signUp}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
