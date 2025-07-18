import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    ScrollView,
} from "react-native";
import {
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import useAchievements from "../hooks/useAchievements";
import useLevelBenefits from "../hooks/useLevelBenefits";
import AchievementCategory from "./AchievementCategory";

const { height: screenHeight } = Dimensions.get("window");
const DRAWER_HEIGHT = screenHeight * 0.9;

interface AchievementDrawerProps {
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    xpData?: {
        total_xp: number;
        current_level: number;
        xp_to_next_level: number;
        xp_progress: number;
    } | null;
    refreshTrigger?: number; // Add this to trigger refresh
}

export const AchievementDrawer: React.FC<AchievementDrawerProps> = ({
    visible,
    onClose,
    userId,
    xpData,
    refreshTrigger,
}) => {
    const translateY = useRef(new Animated.Value(screenHeight)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Fetch achievement data
    const {
        achievements,
        userProgress,
        categoryStats,
        loading: achievementsLoading,
        error: achievementsError,
        refresh: refreshAchievements,
    } = useAchievements(userId);

    // Fetch level benefits
    const {
        nextLevelBenefits,
        loading: benefitsLoading,
        error: benefitsError,
        refresh: refreshBenefits,
    } = useLevelBenefits(xpData?.current_level || null);

    useEffect(() => {
        if (visible) {
            // Trigger haptic feedback on open
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {
                    // Ignore haptic errors
                }
            );

            // Animate drawer opening
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: screenHeight - DRAWER_HEIGHT,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0.5,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate drawer closing
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: screenHeight,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Refresh achievements when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger && visible) {
            console.log(
                "[AchievementDrawer] 🔄 Refreshing achievements due to trigger:",
                refreshTrigger
            );
            refreshAchievements();
            refreshBenefits();
        }
    }, [refreshTrigger, visible, refreshAchievements, refreshBenefits]);

    const handleBackdropPress = () => {
        // Trigger haptic feedback on close
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
            // Ignore haptic errors
        });
        onClose();
    };

    const handleGestureEvent = (event: any) => {
        const { translationY, state } = event.nativeEvent;

        if (state === State.ACTIVE) {
            const newTranslateY = Math.max(
                screenHeight - DRAWER_HEIGHT,
                screenHeight - DRAWER_HEIGHT + translationY
            );
            translateY.setValue(newTranslateY);
        } else if (state === State.END) {
            const shouldClose = translationY > 100;

            if (shouldClose) {
                // Trigger haptic feedback on close
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => {
                        // Ignore haptic errors
                    }
                );
                onClose();
            } else {
                // Snap back to open position
                Animated.spring(translateY, {
                    toValue: screenHeight - DRAWER_HEIGHT,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 8,
                }).start();
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.container}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        onPress={handleBackdropPress}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Drawer */}
                <Animated.View
                    style={[
                        styles.drawer,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <PanGestureHandler onGestureEvent={handleGestureEvent}>
                        <Animated.View style={styles.drawerContent}>
                            {/* Handle bar */}
                            <View style={styles.handleBar} />

                            {/* Single ScrollView for all content */}
                            <ScrollView
                                style={styles.scrollView}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={
                                    styles.scrollContentContainer
                                }
                            >
                                {/* Level Progress Section */}
                                <View style={styles.levelProgressSection}>
                                    <Text style={styles.levelTitle}>
                                        🌱 Level {xpData?.current_level || 1}
                                    </Text>

                                    {/* Progress Bar */}
                                    <View style={styles.progressBarContainer}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${xpData?.xp_progress || 0}%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>
                                            {xpData?.xp_progress || 0}%
                                        </Text>
                                    </View>

                                    <Text style={styles.xpToNext}>
                                        {xpData?.xp_to_next_level || 0} XP to
                                        Level {(xpData?.current_level || 1) + 1}
                                    </Text>
                                </View>

                                {/* Next Level Benefits */}
                                <View style={styles.benefitsSection}>
                                    <Text style={styles.benefitsTitle}>
                                        🎁 Next Level Benefits
                                    </Text>
                                    {benefitsLoading ? (
                                        <Text style={styles.benefitsText}>
                                            Loading benefits...
                                        </Text>
                                    ) : benefitsError ? (
                                        <Text style={styles.benefitsText}>
                                            Failed to load benefits
                                        </Text>
                                    ) : nextLevelBenefits ? (
                                        <Text style={styles.benefitsText}>
                                            {nextLevelBenefits.unlocked_features
                                                .length > 0
                                                ? nextLevelBenefits
                                                      .unlocked_features[0]
                                                : "New features unlocked!"}
                                        </Text>
                                    ) : (
                                        <Text style={styles.benefitsText}>
                                            You've reached the maximum level!
                                        </Text>
                                    )}
                                </View>

                                {/* Achievement Categories */}
                                <View style={styles.achievementsSection}>
                                    {achievementsLoading ? (
                                        // Skeleton Loading
                                        <View style={styles.skeletonContainer}>
                                            {[1, 2, 3].map((i) => (
                                                <View
                                                    key={i}
                                                    style={
                                                        styles.skeletonCategory
                                                    }
                                                >
                                                    <View
                                                        style={
                                                            styles.skeletonTitle
                                                        }
                                                    />
                                                    <View
                                                        style={
                                                            styles.skeletonCard
                                                        }
                                                    />
                                                    <View
                                                        style={
                                                            styles.skeletonCard
                                                        }
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    ) : achievementsError ? (
                                        <View style={styles.errorContainer}>
                                            <Text style={styles.errorText}>
                                                Failed to load achievements:{" "}
                                                {achievementsError}
                                            </Text>
                                        </View>
                                    ) : (
                                        // Real Achievement Data
                                        <>
                                            {[
                                                "daily",
                                                "milestones",
                                                "weather",
                                                "social",
                                                "collection",
                                            ].map((category) => {
                                                const categoryAchievements =
                                                    achievements.filter(
                                                        (achievement) =>
                                                            achievement.category ===
                                                            category
                                                    );

                                                if (
                                                    categoryAchievements.length ===
                                                    0
                                                )
                                                    return null;

                                                return (
                                                    <AchievementCategory
                                                        key={category}
                                                        category={category}
                                                        achievements={
                                                            categoryAchievements
                                                        }
                                                        userProgress={
                                                            userProgress
                                                        }
                                                        categoryStats={
                                                            categoryStats[
                                                                category
                                                            ] || {
                                                                total: 0,
                                                                completed: 0,
                                                            }
                                                        }
                                                    />
                                                );
                                            })}
                                        </>
                                    )}
                                </View>
                            </ScrollView>
                        </Animated.View>
                    </PanGestureHandler>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
    },
    backdropTouchable: {
        flex: 1,
    },
    drawer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-end",
    },
    drawerContent: {
        height: DRAWER_HEIGHT,
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: "#e0e0e0",
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    levelProgressSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "rgba(34, 197, 94, 0.05)",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
    },
    levelTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#006400",
        textAlign: "center",
        marginBottom: 8,
    },
    xpDisplay: {
        fontSize: 18,
        fontWeight: "600",
        color: "#006400",
        textAlign: "center",
        marginBottom: 12,
    },
    progressBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        borderRadius: 4,
        marginRight: 12,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#22c55e",
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#006400",
        minWidth: 40,
    },
    xpToNext: {
        fontSize: 14,
        color: "#006400",
        textAlign: "center",
        opacity: 0.8,
    },
    benefitsSection: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: "rgba(255, 193, 7, 0.1)",
        borderRadius: 12,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#b8860b",
        marginBottom: 4,
    },
    benefitsText: {
        fontSize: 14,
        color: "#b8860b",
        opacity: 0.9,
    },

    achievementsSection: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    achievementCard: {
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#22c55e",
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#006400",
        marginBottom: 4,
    },
    achievementDescription: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    achievementReward: {
        fontSize: 14,
        fontWeight: "600",
        color: "#006400",
        marginBottom: 8,
    },
    achievementProgressBar: {
        height: 6,
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        borderRadius: 3,
        overflow: "hidden",
    },
    achievementProgressFill: {
        height: "100%",
        backgroundColor: "#22c55e",
        borderRadius: 3,
    },
    skeletonContainer: {
        paddingHorizontal: 20,
    },
    skeletonCategory: {
        marginBottom: 24,
    },
    skeletonTitle: {
        height: 24,
        backgroundColor: "#e5e7eb",
        borderRadius: 4,
        marginBottom: 16,
        width: "60%",
    },
    skeletonCard: {
        height: 80,
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        marginBottom: 12,
    },
    errorContainer: {
        padding: 20,
        alignItems: "center",
    },
    errorText: {
        fontSize: 14,
        color: "#ef4444",
        textAlign: "center",
    },
});

export default AchievementDrawer;
