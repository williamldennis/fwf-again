import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, ScrollView } from "react-native";

interface Achievement {
    id: string;
    name: string;
    description: string;
    xpReward: number;
    category: string;
}

interface AchievementToastProps {
    visible: boolean;
    achievements: Achievement[];
    totalXPAwarded: number;
    onHide: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({
    visible,
    achievements,
    totalXPAwarded,
    onHide,
}) => {
    const translateY = new Animated.Value(-200);
    const opacity = new Animated.Value(0);
    const scale = new Animated.Value(0.8);

    useEffect(() => {
        if (visible) {
            // Show toast with celebration animation
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Hide after 6 seconds (longer for achievements)
            const timer = setTimeout(() => {
                hideToast();
            }, 6000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -200,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    if (!visible || achievements.length === 0) return null;

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "daily":
                return "📅";
            case "milestones":
                return "🏆";
            case "weather":
                return "🌤️";
            case "social":
                return "👥";
            case "collection":
                return "📚";
            default:
                return "🎯";
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }, { scale }],
                    opacity,
                },
            ]}
        >
            <View style={styles.toast}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.icon}>🏆</Text>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>
                            {achievements.length === 1
                                ? "Achievement Unlocked!"
                                : `${achievements.length} Achievements Unlocked!`}
                        </Text>
                        <Text style={styles.xpAmount}>
                            +{totalXPAwarded} XP
                        </Text>
                    </View>
                </View>

                {/* Achievement List */}
                <ScrollView
                    style={styles.achievementList}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    {achievements.map((achievement, index) => (
                        <View
                            key={achievement.id}
                            style={styles.achievementItem}
                        >
                            <View style={styles.achievementHeader}>
                                <Text style={styles.categoryIcon}>
                                    {getCategoryIcon(achievement.category)}
                                </Text>
                                <View style={styles.achievementInfo}>
                                    <Text style={styles.achievementName}>
                                        {achievement.name}
                                    </Text>
                                    <Text style={styles.achievementDescription}>
                                        {achievement.description}
                                    </Text>
                                </View>
                                <Text style={styles.achievementXP}>
                                    +{achievement.xpReward}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Close button */}
                <View style={styles.closeButton}>
                    <Text style={styles.closeText}>Tap to dismiss</Text>
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
        zIndex: 10000, // Higher than regular XP toast
    },
    toast: {
        backgroundColor: "rgba(255, 193, 7, 0.95)", // Gold background for achievements
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.3)",
        maxHeight: 400, // Limit height for scrolling
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    icon: {
        fontSize: 32,
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: "white",
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 4,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    xpAmount: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    achievementList: {
        maxHeight: 200,
    },
    achievementItem: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.2)",
    },
    achievementHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    categoryIcon: {
        fontSize: 20,
        marginRight: 12,
        marginTop: 2,
    },
    achievementInfo: {
        flex: 1,
        marginRight: 8,
    },
    achievementName: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 2,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    achievementDescription: {
        color: "white",
        fontSize: 12,
        fontWeight: "500",
        opacity: 0.9,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    achievementXP: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    closeButton: {
        alignItems: "center",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.2)",
    },
    closeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "500",
        opacity: 0.8,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default AchievementToast;
