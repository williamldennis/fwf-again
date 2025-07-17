import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

interface XPToastProps {
    visible: boolean;
    message: string;
    xpAmount?: number;
    subtitle?: string; // Detailed breakdown of XP sources
    onHide: () => void;
}

const XPToast: React.FC<XPToastProps> = ({
    visible,
    message,
    xpAmount,
    subtitle,
    onHide,
}) => {
    const translateY = new Animated.Value(-100);
    const opacity = new Animated.Value(0);

    useEffect(() => {
        if (visible) {
            // Show toast
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Hide after 3 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <View style={styles.toast}>
                <Text style={styles.icon}>🎉</Text>
                <View style={styles.content}>
                    <Text style={styles.message}>{message}</Text>
                    {subtitle && (
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    )}
                    {xpAmount && (
                        <Text style={styles.xpAmount}>+{xpAmount} XP</Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 120, // Below header
        left: 20,
        right: 20,
        zIndex: 9999, // Very high z-index to ensure it appears above modals
    },
    toast: {
        backgroundColor: "rgba(34, 197, 94, 1.0)",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    icon: {
        fontSize: 24,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    message: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        color: "white",
        fontSize: 12,
        fontWeight: "500",
        opacity: 0.9,
        marginBottom: 2,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    xpAmount: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
        opacity: 1.0,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default XPToast;
