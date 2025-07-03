import { useState } from 'react';
import { View, Text, Button, Alert, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { supabase } from '../utils/supabase';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import contactsImg from '../../assets/images/contacts.png';

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

            // Fetch user's country code from profile (default to 'US')
            let userCountryCode: CountryCode = 'US' as CountryCode;
            const { data: profile } = await supabase
                .from('profiles')
                .select('country_code')
                .eq('id', user.id)
                .single();
            if (profile && profile.country_code) {
                userCountryCode = profile.country_code as CountryCode;
            }

            // Prepare rows for bulk insert
            const rows: ContactRow[] = [];
            data.forEach(contact => {
                (contact.phoneNumbers || []).forEach(pn => {
                    if (pn.number) {
                        // Normalize to E.164 using libphonenumber-js
                        let e164 = null;
                        try {
                            // Use user's country code as default
                            const phoneNumber = parsePhoneNumberFromString(pn.number, userCountryCode);
                            if (phoneNumber && phoneNumber.isValid()) {
                                e164 = phoneNumber.number; // E.164 format
                            }
                        } catch (e) {
                            // Ignore invalid numbers
                        }
                        if (e164) {
                            rows.push({
                                user_id: user.id,
                                contact_phone: e164,
                                contact_name: contact.name,
                            });
                        }
                    }
                });
            });

            console.log(`Total contacts to upload: ${rows.length}`);
            console.log(`Sample contacts:`, rows.slice(0, 5));

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
        <View style={styles.container}>
            <Image source={contactsImg} style={styles.emojiImg} resizeMode="contain" />
            <Text style={styles.label}>Access your contacts</Text>
            <Text style={styles.subtext}>This is how we connect you with friends.</Text>
            <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.2 }]}
                onPress={handleApprove}
                disabled={loading}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>{loading ? `Uploading... ${progress}%` : 'Approve'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F3F6FB',
    },
    emojiImg: {
        width: 200,
        height: 200,
        marginBottom: 12,
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
