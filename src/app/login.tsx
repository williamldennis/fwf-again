import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
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
                .select('contacts_approved, location_approved')
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
                router.replace('/home');
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
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                value={email}
            />
            <TextInput
                style={styles.input}
                placeholder="password"
                secureTextEntry
                onChangeText={setPassword}
                value={password}
            />
            <Button title="Sign In" onPress={signIn} />
            <Button title="Sign Up" onPress={signUp} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    input: {
        borderBottomWidth: 1,
        marginBottom: 20,
        padding: 10,
        fontSize: 16,
    },
});
