import { useState } from "react";
import {
    View,
    Text,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { supabase } from "../utils/supabase";
import { router } from "expo-router";

export default function NameInput() {
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert("Please enter your name.");
            return;
        }

        if (fullName.trim().length < 2) {
            Alert.alert("Name must be at least 2 characters long.");
            return;
        }

        setLoading(true);
        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();
            const user = session?.user;
            if (sessionError || !user) {
                Alert.alert("Could not get user info.");
                return;
            }

            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName.trim() })
                .eq("id", user.id);

            if (error) {
                Alert.alert("Failed to save name:", error.message);
            } else {
                router.replace("/contacts-permission");
            }
        } catch (error) {
            Alert.alert("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={styles.title}>What's your name?</Text>
                    <Text style={styles.subtitle}>
                        This will be shown to your friends when you plant in
                        their gardens
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your full name"
                            value={fullName}
                            onChangeText={setFullName}
                            autoFocus
                            autoCapitalize="words"
                            autoCorrect={false}
                            maxLength={50}
                            returnKeyType="done"
                            onSubmitEditing={handleSave}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!fullName.trim() || loading) &&
                                styles.buttonDisabled,
                        ]}
                        onPress={handleSave}
                        disabled={!fullName.trim() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Continue</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.note}>
                        You can change this later in your profile settings
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
    },
    content: {
        alignItems: "center",
        maxWidth: 400,
        alignSelf: "center",
        width: "100%",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#222",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 40,
        lineHeight: 24,
    },
    inputContainer: {
        width: "100%",
        marginBottom: 30,
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        textAlign: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    button: {
        backgroundColor: "#007AFF",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: "#ccc",
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    note: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginTop: 20,
        fontStyle: "italic",
    },
});
