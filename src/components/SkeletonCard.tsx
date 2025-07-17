import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

interface SkeletonCardProps {
    width: number;
    height?: number;
    style?: any;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    width,
    height = 200,
    style,
}) => {
    const shimmerValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmerAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmerAnimation.start();
        return () => shimmerAnimation.stop();
    }, [shimmerValue]);

    const shimmerOpacity = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <View style={[styles.container, { width, height }, style]}>
            {/* Header skeleton */}
            <View style={styles.header}>
                <Animated.View
                    style={[styles.avatar, { opacity: shimmerOpacity }]}
                />
                <View style={styles.headerText}>
                    <Animated.View
                        style={[styles.titleLine, { opacity: shimmerOpacity }]}
                    />
                    <Animated.View
                        style={[
                            styles.subtitleLine,
                            { opacity: shimmerOpacity },
                        ]}
                    />
                </View>
            </View>

            {/* Weather section skeleton */}
            <View style={styles.weatherSection}>
                <Animated.View
                    style={[styles.weatherIcon, { opacity: shimmerOpacity }]}
                />
                <View style={styles.weatherText}>
                    <Animated.View
                        style={[
                            styles.weatherLine,
                            { opacity: shimmerOpacity },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.weatherLine2,
                            { opacity: shimmerOpacity },
                        ]}
                    />
                </View>
            </View>

            {/* Garden section skeleton */}
            <View style={styles.gardenSection}>
                <Animated.View
                    style={[styles.gardenTitle, { opacity: shimmerOpacity }]}
                />
                <View style={styles.potsContainer}>
                    {[1, 2, 3].map((i) => (
                        <Animated.View
                            key={i}
                            style={[styles.pot, { opacity: shimmerOpacity }]}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f8f9fa",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#e9ecef",
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    titleLine: {
        height: 16,
        backgroundColor: "#e9ecef",
        borderRadius: 8,
        marginBottom: 8,
        width: "60%",
    },
    subtitleLine: {
        height: 12,
        backgroundColor: "#e9ecef",
        borderRadius: 6,
        width: "40%",
    },
    weatherSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        padding: 12,
        backgroundColor: "#e3f2fd",
        borderRadius: 12,
    },
    weatherIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#e9ecef",
        borderRadius: 20,
        marginRight: 12,
    },
    weatherText: {
        flex: 1,
    },
    weatherLine: {
        height: 14,
        backgroundColor: "#e9ecef",
        borderRadius: 7,
        marginBottom: 6,
        width: "70%",
    },
    weatherLine2: {
        height: 12,
        backgroundColor: "#e9ecef",
        borderRadius: 6,
        width: "50%",
    },
    gardenSection: {
        marginTop: 8,
    },
    gardenTitle: {
        height: 16,
        backgroundColor: "#e9ecef",
        borderRadius: 8,
        marginBottom: 12,
        width: "40%",
    },
    potsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    pot: {
        width: 60,
        height: 60,
        backgroundColor: "#e9ecef",
        borderRadius: 30,
    },
});

export default SkeletonCard;
