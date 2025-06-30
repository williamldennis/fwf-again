import { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { supabase } from '../utils/supabase';

const BATCH_SIZE = 200;

type ContactRow = {
    user_id: string;
    contact_phone: string;
    contact_name?: string;
};

export default function ContactsPermission() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleApprove = async () => {
        setLoading(true);
        setProgress(0);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] });
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Could not get user info.');
                setLoading(false);
                return;
            }

            // Prepare rows for bulk insert
            const rows: ContactRow[] = [];
            data.forEach(contact => {
                (contact.phoneNumbers || []).forEach(pn => {
                    if (pn.number) {
                        rows.push({
                            user_id: user.id,
                            contact_phone: pn.number.replace(/\D/g, ''), // normalize
                            contact_name: contact.name,
                        });
                    }
                });
            });

            // Optionally: clear old contacts first
            await supabase.from('user_contacts').delete().eq('user_id', user.id);

            // Batch insert
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('user_contacts').insert(batch);
                setProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / rows.length) * 100)));
                if (error) {
                    Alert.alert('Failed to upload some contacts', error.message);
                    setLoading(false);
                    return;
                }
            }

            // Mark contacts approved
            await supabase.from('profiles').update({ contacts_approved: true, contacts_count: data.length }).eq('id', user.id);

            router.replace('/location-permission');
        } else {
            Alert.alert('Permission denied', 'You need to allow contacts access to continue.');
        }
        setLoading(false);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>We need access to your contacts to continue.</Text>
            <Button title={loading ? `Uploading... ${progress}%` : 'Approve'} onPress={handleApprove} disabled={loading} />
        </View>
    );
}
