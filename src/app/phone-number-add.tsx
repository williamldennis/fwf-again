import { useState, useRef } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import PhoneInput, { PhoneInputProps } from 'react-native-phone-number-input';
import type { ComponentType } from 'react';
import phoneImg from '../../assets/images/phone.png';

// Type assertion to fix the constructor signature issue
const TypedPhoneInput = PhoneInput as unknown as ComponentType<PhoneInputProps>;

export default function PhoneNumberAdd() {
    const [phone, setPhone] = useState('');
    const [formattedPhone, setFormattedPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const phoneInput = useRef<PhoneInput>(null);

    const handleSave = async () => {
        if (!isValid) {
            Alert.alert('Please enter a valid phone number.');
            return;
        }
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const user = session?.user;
        if (sessionError || !user) {
            Alert.alert('Could not get user info.');
            setLoading(false);
            return;
        }
        const { error } = await supabase.from('profiles').update({ phone_number: formattedPhone }).eq('id', user.id);
        if (error) {
            Alert.alert('Failed to save phone number:', error.message);
        } else {
            router.replace('/contacts-permission');
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <View style={styles.container}>
                <Image source={phoneImg} style={styles.emojiImg} resizeMode="contain" />
                <Text style={styles.label}>Enter your phone number</Text>
                <Text style={styles.subtext}> We'll use this to connect you with friends.</Text>
                {/* @ts-ignore - Library has incompatible constructor signature */}
                <PhoneInput
                    ref={phoneInput}
                    defaultValue={phone}
                    defaultCode="US"
                    layout="second"
                    autoFocus={true}
                    onChangeText={setPhone}
                    onChangeFormattedText={text => {
                        setFormattedPhone(text);
                        setIsValid(phoneInput.current?.isValidNumber(text) ?? false);
                    }}
                    containerStyle={styles.phoneInputContainer}
                    textContainerStyle={styles.phoneInputTextContainer}
                    textInputProps={{ placeholder: 'Phone number' }}
                    textInputStyle={{ fontSize: 17, color: '#222' }}
                    codeTextStyle={{ fontSize: 17, color: '#222' }}
                    flagButtonStyle={{ borderRadius: 12 }}
                />
                <Text style={styles.helperText}>
                    {isValid ? '✓ Valid number' : 'Enter a valid phone number'}
                </Text>
                <TouchableOpacity
                    style={[styles.button, (!isValid || loading) && { opacity: 0.2 }]}
                    onPress={handleSave}
                    disabled={!isValid || loading || !phoneInput.current?.isValidNumber(formattedPhone)}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Continue</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F3F6FB',
    },
    emojiImg: {
        width: 200,
        height: 200,
        marginBottom: 16,
    },
    label: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 8,
        color: '#222',
    },
    subtext: {
        fontSize: 15,
        color: '#555',
        marginBottom: 16,
        textAlign: 'center',
    },
    phoneInputContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    phoneInputTextContainer: {
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    helperText: {
        color: '#888',
        fontSize: 13,
        marginBottom: 8,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        shadowColor: '#007AFF',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        marginBottom: 24,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
