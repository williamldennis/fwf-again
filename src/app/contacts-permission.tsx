import { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { supabase } from '../utils/supabase';

export default function ContactsPermission() {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Emails] });
            // Example: just store the count of contacts
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('profiles').update({ contactsApproved: true, contactsCount: data.length }).eq('id', user?.id);
            router.replace('/location-permission');
        } else {
            Alert.alert('Permission denied', 'You need to allow contacts access to continue.');
        }
        setLoading(false);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>We need access to your contacts to continue.</Text>
            <Button title={loading ? "Processing..." : "Approve"} onPress={handleApprove} disabled={loading} />
        </View>
    );
}
