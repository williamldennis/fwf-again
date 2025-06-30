// src/app/login.tsx

import { router } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { app } from '../utils/firebase';
import { getAuth, signInWithPhoneNumber } from 'firebase/auth';

export default function LoginScreen() {
    const [phone, setPhone] = useState('');
    const [confirmation, setConfirmation] = useState<any>(null);
    const [code, setCode] = useState('');

    const sendCode = async () => {
    try {
        const auth = getAuth(app);
        const confirmation = await signInWithPhoneNumber(auth, phone);
        setConfirmation(confirmation);
    } catch (error) {
        console.error('Error sending code:', error);
    }
};

    const confirmCode = async () => {
        try {
            await confirmation.confirm(code);
            router.replace('/'); // send to Home
        } catch (error) {
            console.error('Invalid code:', error);
        }
    };

    return (
        <View style={styles.container}>
            {!confirmation ? (
                <>
                    <Text>Enter phone number:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+1234567890"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <Button title="Send Code" onPress={sendCode} />
                </>
            ) : (
                <>
                    <Text>Enter verification code:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="123456"
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                    />
                    <Button title="Confirm Code" onPress={confirmCode} />
                </>
            )}
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
