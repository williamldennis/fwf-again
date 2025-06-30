import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';

export default function PhoneNumberAdd() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!phone) {
            Alert.alert('Please enter your phone number.');
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
        const normalizedPhone = phone.replace(/\D/g, ''); // removes all non-digits
        const { error } = await supabase.from('profiles').update({ phone_number: normalizedPhone }).eq('id', user.id);
        if (error) {
            Alert.alert('Failed to save phone number:', error.message);
        } else {
            router.replace('/contacts-permission');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Enter your phone number:</Text>
            <TextInput
                style={styles.input}
                placeholder="Phone number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
            />
            <Button title={loading ? 'Saving...' : 'Continue'} onPress={handleSave} disabled={loading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    label: { fontSize: 18, marginBottom: 12 },
    input: { borderBottomWidth: 1, marginBottom: 20, padding: 10, fontSize: 16, width: '100%' },
});
