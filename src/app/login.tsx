import { useState, useEffect, useRef } from "react";
import { pb, isAuthenticated } from "../utils/pocketbase";
import {
    View,
    TextInput,
    Button,
    Text,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    Keyboard,
    Animated,
    Easing,
} from "react-native";
import { router , Stack } from "expo-router";
import * as Location from "expo-location";
import * as Contacts from "expo-contacts";
import { VideoView, useVideoPlayer } from "expo-video";

export const options = { headerShown: false };

export const unstable_settings = {
    initialRouteName: "login",
};

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [logoImageMargin, setLogoImageMargin] = useState(16);
    const logoScale = useRef(new Animated.Value(1)).current;
    const logoMargin = useRef(new Animated.Value(16)).current;
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [loadingButton, setLoadingButton] = useState<
        "signin" | "signup" | null
    >(null);
    const spinValue = useRef(new Animated.Value(0)).current;

    // Video player for background
    const player = useVideoPlayer(require("../../assets/videos/login-bg.mp4"), player => {
        player.loop = true;
        player.muted = true;
        player.play();
    });

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            "keyboardWillShow",
            () => {
                setIsKeyboardOpen(true);
                setLogoImageMargin(-50);
                Animated.parallel([
                    Animated.timing(logoScale, {
                        toValue: 0.6,
                        duration: 250,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.ease),
                    }),
                    Animated.timing(logoMargin, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: false,
                        easing: Easing.out(Easing.ease),
                    }),
                ]).start();
                setTimeout(() => {
                    if (scrollViewRef.current) {
                        scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                }, 300);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            "keyboardWillHide",
            () => {
                setIsKeyboardOpen(false);
                setLogoImageMargin(16);
                Animated.parallel([
                    Animated.timing(logoScale, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.ease),
                    }),
                    Animated.timing(logoMargin, {
                        toValue: 16,
                        duration: 250,
                        useNativeDriver: false,
                        easing: Easing.out(Easing.ease),
                    }),
                ]).start();
            }
        );
        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [logoScale, logoMargin]);

    // Spinning animation for loading spinner
    useEffect(() => {
        if (isLoading) {
            const spinAnimation = Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.linear,
                })
            );
            spinAnimation.start();
            return () => spinAnimation.stop();
        }
    }, [isLoading, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const checkPermissionsAndRedirect = async () => {
        if (!isAuthenticated() || !pb.authStore.model) {
            return;
        }

        const user = pb.authStore.model;

        // Check phone number first
        if (!user.phone_number) {
            router.replace("/phone-number-add");
        } else if (!user.full_name) {
            router.replace("/name-input");
        } else if (!user.contacts_approved) {
            router.replace("/contacts-permission");
        } else if (!user.location_approved) {
            router.replace("/location-permission");
        } else {
            // Check if location permission is actually granted on device
            const { status } =
                await Location.getForegroundPermissionsAsync();
            if (status !== "granted") {
                router.replace("/location-permission");
                return;
            }

            const requiredSelfies = [
                "sunny",
                "cloudy",
                "rainy",
                "snowy",
                "thunderstorm",
            ];
            const selfies = user.selfie_urls || {};
            const hasAllSelfies = requiredSelfies.every(
                (key) => selfies[key] && typeof selfies[key] === 'string' && selfies[key].trim().length > 0
            );
            if (!hasAllSelfies) {
                router.replace("/selfie");
            } else {
                router.replace("/home");
            }
        }
    };

    const signIn = async () => {
        if (isLoading) return; // Prevent multiple taps

        setIsLoading(true);
        setLoadingButton("signin");
        setLoadingText("Signing in...");

        try {
            await pb.collection('users').authWithPassword(email, password);
            setLoadingText("Signing in...");
            await checkPermissionsAndRedirect();
        } catch (error: any) {
            alert(error.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingButton(null);
            setLoadingText("");
        }
    };

    const signUp = async () => {
        if (isLoading) return; // Prevent multiple taps

        setIsLoading(true);
        setLoadingButton("signup");
        setLoadingText("Creating account...");

        try {
            // Create user with initial profile data
            await pb.collection('users').create({
                email,
                password,
                passwordConfirm: password,
                points: 0,
                total_xp: 0,
                current_level: 1,
                xp_to_next_level: 100,
            });

            // Automatically sign in after signup
            await pb.collection('users').authWithPassword(email, password);
            router.replace("/phone-number-add");
        } catch (error: any) {
            alert(error.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingButton(null);
            setLoadingText("");
        }
    };

    return (
        <>
            <View style={{ flex: 1 }}>
                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    nativeControls={false}
                />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={-30}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: isKeyboardOpen
                                ? "flex-start"
                                : "center",
                            padding: 20,
                            paddingBottom: 40,
                        }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View>
                            <Animated.View
                                style={{
                                    alignItems: "center",
                                    marginBottom: logoMargin,
                                }}
                            >
                                <Animated.Image
                                    source={require("../../assets/images/lock-up.png")}
                                    style={{
                                        width: 260,
                                        height: 260,
                                        resizeMode: "contain",
                                        marginBottom: logoImageMargin,
                                        transform: [{ scale: logoScale }],
                                    }}
                                    accessibilityLabel="Fair Weather Friends logo"
                                />
                            </Animated.View>
                            <TextInput
                                className="p-5 mb-5 h-20 text-lg font-bold text-white rounded-xl border border-gray-300"
                                placeholder="email"
                                placeholderTextColor="#fff"
                                autoCapitalize="none"
                                textContentType="username"
                                autoComplete="email"
                                onChangeText={setEmail}
                                value={email}
                                editable={!isLoading}
                            />
                            <TextInput
                                className="p-5 mb-5 h-20 text-lg font-bold text-white rounded-xl border border-gray-300"
                                placeholder="password"
                                placeholderTextColor="#fff"
                                textContentType="password"
                                autoComplete="password"
                                secureTextEntry
                                onChangeText={setPassword}
                                value={password}
                                editable={!isLoading}
                            />
                            <View style={{ width: "100%" }}>
                                {/* Sign Up Button: Gold, 50% opacity, blur */}
                                <View
                                    style={{
                                        marginBottom: 12,
                                        borderRadius: 8,
                                        overflow: "hidden",
                                    }}
                                >
                                    <View
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: "#FFD700", // Gold
                                            opacity: 0.5,
                                        }}
                                    />
                                    {/* If expo-blur is available, wrap in BlurView for extra blur effect */}
                                    {/* <BlurView intensity={30} style={StyleSheet.absoluteFill} /> */}
                                    <TouchableOpacity
                                        style={{
                                            paddingVertical: 16,
                                            borderRadius: 8,
                                            alignItems: "center",
                                            opacity:
                                                isLoading &&
                                                loadingButton === "signup"
                                                    ? 0.6
                                                    : 1,
                                        }}
                                        onPress={signUp}
                                        disabled={isLoading}
                                    >
                                        {isLoading &&
                                        loadingButton === "signup" ? (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Animated.View
                                                    style={{
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 8,
                                                        borderWidth: 2,
                                                        borderColor: "#fff",
                                                        borderTopColor:
                                                            "transparent",
                                                        marginRight: 8,
                                                        transform: [
                                                            { rotate: spin },
                                                        ],
                                                    }}
                                                />
                                                <Text
                                                    style={{
                                                        color: "#fff",
                                                        fontWeight: "bold",
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    {loadingText ||
                                                        "Loading..."}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text
                                                style={{
                                                    color: "#fff",
                                                    fontWeight: "bold",
                                                    fontSize: 16,
                                                }}
                                            >
                                                Sign Up
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {/* Sign In Button: White, 50% opacity, blur */}
                                <View
                                    style={{
                                        borderRadius: 8,
                                        overflow: "hidden",
                                    }}
                                >
                                    <View
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: "#fff",
                                            opacity: 0.5,
                                        }}
                                    />
                                    {/* <BlurView intensity={30} style={StyleSheet.absoluteFill} /> */}
                                    <TouchableOpacity
                                        style={{
                                            paddingVertical: 16,
                                            borderRadius: 8,
                                            alignItems: "center",
                                            opacity:
                                                isLoading &&
                                                loadingButton === "signin"
                                                    ? 0.6
                                                    : 1,
                                        }}
                                        onPress={signIn}
                                        disabled={isLoading}
                                    >
                                        {isLoading &&
                                        loadingButton === "signin" ? (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Animated.View
                                                    style={{
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 8,
                                                        borderWidth: 2,
                                                        borderColor: "#222",
                                                        borderTopColor:
                                                            "transparent",
                                                        marginRight: 8,
                                                        transform: [
                                                            { rotate: spin },
                                                        ],
                                                    }}
                                                />
                                                <Text
                                                    style={{
                                                        color: "#222",
                                                        fontWeight: "bold",
                                                        fontSize: 16,
                                                    }}
                                                >
                                                    {loadingText ||
                                                        "Loading..."}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text
                                                style={{
                                                    color: "#222",
                                                    fontWeight: "bold",
                                                    fontSize: 16,
                                                }}
                                            >
                                                Sign In
                                            </Text>
                                        )}
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
