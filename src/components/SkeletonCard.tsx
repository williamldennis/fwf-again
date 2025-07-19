import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ScrollView } from "react-native";

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
            {/* Lottie animation area skeleton */}
            <View style={styles.lottieArea}>
                <Animated.View
                    style={[
                        styles.lottiePlaceholder,
                        { opacity: shimmerOpacity },
                    ]}
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.mainContent}>
                    {/* Main card container */}
                    <View style={styles.cardContainer}>
                        {/* Profile image skeleton */}
                        <Animated.View
                            style={[
                                styles.profileImage,
                                { opacity: shimmerOpacity },
                            ]}
                        />

                        {/* Garden area skeleton */}
                        <View style={styles.gardenSection}>
                            <Animated.View
                                style={[
                                    styles.gardenTitle,
                                    { opacity: shimmerOpacity },
                                ]}
                            />
                            <View style={styles.potsContainer}>
                                {[1, 2, 3].map((i) => (
                                    <Animated.View
                                        key={i}
                                        style={[
                                            styles.pot,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Weather card skeleton */}
                        <View style={styles.weatherCard}>
                            <Animated.View
                                style={[
                                    styles.weatherIcon,
                                    { opacity: shimmerOpacity },
                                ]}
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
                    </View>

                    {/* Hourly forecast card skeleton */}
                    <View style={styles.hourlyForecastCard}>
                        <Animated.View
                            style={[
                                styles.cardTitle,
                                { opacity: shimmerOpacity },
                            ]}
                        />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.hourlyScroll}
                        >
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <View key={i} style={styles.hourlyItem}>
                                    <Animated.View
                                        style={[
                                            styles.hourlyTime,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.hourlyIcon,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.hourlyTemp,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* 7-day forecast card skeleton */}
                    <View style={styles.weeklyForecastCard}>
                        <Animated.View
                            style={[
                                styles.cardTitle,
                                { opacity: shimmerOpacity },
                            ]}
                        />
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <View key={i} style={styles.weeklyItem}>
                                <View style={styles.weeklyLeft}>
                                    <Animated.View
                                        style={[
                                            styles.weeklyDay,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.weeklyDesc,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                </View>
                                <Animated.View
                                    style={[
                                        styles.weeklyIcon,
                                        { opacity: shimmerOpacity },
                                    ]}
                                />
                                <View style={styles.weeklyTemps}>
                                    <Animated.View
                                        style={[
                                            styles.weeklyMax,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.weeklyMin,
                                            { opacity: shimmerOpacity },
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
    },
    lottieArea: {
        position: "absolute",
        top: -20,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 0,
    },
    lottiePlaceholder: {
        width: 1100,
        height: 1100,
        backgroundColor: "#e9ecef",
        borderRadius: 550,
        opacity: 0.1,
    },
    scrollView: {
        flex: 1,
        zIndex: 1,
    },
    scrollContent: {
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        minHeight: 800,
    },
    mainContent: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    cardContainer: {
        width: "100%",
        maxWidth: "100%",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: "#fff",
        paddingBottom: 10,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#e9ecef",
        marginTop: 150,
        marginBottom: 60,
    },
    gardenSection: {
        width: "100%",
        alignItems: "center",
        marginBottom: 20,
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
        width: "100%",
        paddingHorizontal: 20,
    },
    pot: {
        width: 60,
        height: 60,
        backgroundColor: "#e9ecef",
        borderRadius: 30,
    },
    weatherCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#e3f2fd",
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
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
    hourlyForecastCard: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        height: 18,
        backgroundColor: "#e9ecef",
        borderRadius: 9,
        marginBottom: 16,
        width: "60%",
    },
    hourlyScroll: {
        marginHorizontal: -10,
    },
    hourlyItem: {
        alignItems: "center",
        marginHorizontal: 10,
        minWidth: 60,
    },
    hourlyTime: {
        height: 12,
        backgroundColor: "#e9ecef",
        borderRadius: 6,
        marginBottom: 8,
        width: 30,
    },
    hourlyIcon: {
        width: 40,
        height: 40,
        backgroundColor: "#e9ecef",
        borderRadius: 20,
        marginBottom: 8,
    },
    hourlyTemp: {
        height: 16,
        backgroundColor: "#e9ecef",
        borderRadius: 8,
        width: 25,
    },
    weeklyForecastCard: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
        marginBottom: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    weeklyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f8f9fa",
    },
    weeklyLeft: {
        flex: 1,
    },
    weeklyDay: {
        height: 16,
        backgroundColor: "#e9ecef",
        borderRadius: 8,
        marginBottom: 4,
        width: "60%",
    },
    weeklyDesc: {
        height: 14,
        backgroundColor: "#e9ecef",
        borderRadius: 7,
        marginBottom: 2,
        width: "80%",
    },
    weeklyIcon: {
        width: 50,
        height: 50,
        backgroundColor: "#e9ecef",
        borderRadius: 25,
        marginHorizontal: 16,
    },
    weeklyTemps: {
        alignItems: "flex-end",
    },
    weeklyMax: {
        height: 18,
        backgroundColor: "#e9ecef",
        borderRadius: 9,
        marginBottom: 4,
        width: 30,
    },
    weeklyMin: {
        height: 16,
        backgroundColor: "#e9ecef",
        borderRadius: 8,
        width: 25,
    },
});

export default SkeletonCard;
