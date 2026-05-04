import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import useAchievements from "../hooks/useAchievements";
import AchievementCategory from "./AchievementCategory";
import { pb } from "../utils/pocketbase";

const { height: screenHeight } = Dimensions.get("window");

interface PlantStats {
    plantId: string;
    plantName: string;
    timesPlanted: number;
    timesHarvested: number;
    growthTimeHours: number;
    harvestPoints: number;
    weatherBonus: {
        sunny: number;
        cloudy: number;
        rainy: number;
    };
}

interface GardenProfileModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    currentPoints: number;
    xpData?: {
        total_xp: number;
        current_level: number;
        xp_to_next_level: number;
        xp_progress: number;
    } | null;
    refreshTrigger?: number;
}

// Plant images mapping
const PLANT_IMAGES: Record<string, any> = {
    sunflower: require("../../assets/images/plants/sunflower/mature.png"),
    mushroom: require("../../assets/images/plants/mushroom/mature.png"),
    fern: require("../../assets/images/plants/fern/mature.png"),
    cactus: require("../../assets/images/plants/cactus/mature.png"),
    water_lily: require("../../assets/images/plants/water_lily/mature.png"),
    pine_tree: require("../../assets/images/plants/pine_tree/mature.png"),
};

export const GardenProfileModal: React.FC<GardenProfileModalProps> = ({
    visible,
    onClose,
    userId,
    currentPoints,
    xpData,
    refreshTrigger,
}) => {
    const [activeTab, setActiveTab] = useState<"collection" | "achievements">("collection");
    const [statsExpanded, setStatsExpanded] = useState(false);
    const [plantStats, setPlantStats] = useState<PlantStats[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);

    // Fetch achievements
    const {
        achievements,
        userProgress,
        categoryStats,
        loading: achievementsLoading,
        error: achievementsError,
        refresh: refreshAchievements,
    } = useAchievements(userId);

    // Fetch plant stats
    const fetchPlantStats = useCallback(async () => {
        if (!userId) return;

        setLoadingStats(true);
        try {
            // Get all plant types
            const plants = await pb.collection("plants").getFullList({
                sort: "name",
            });

            // Get user's planting/harvesting counts from garden_activities
            const activities = await pb.collection("garden_activities").getFullList({
                filter: `actor = "${userId}"`,
            });

            // Aggregate counts per plant
            const statsMap = new Map<string, { planted: number; harvested: number }>();

            activities.forEach((activity: any) => {
                const plantId = activity.plant;
                if (!statsMap.has(plantId)) {
                    statsMap.set(plantId, { planted: 0, harvested: 0 });
                }
                const stats = statsMap.get(plantId)!;
                if (activity.activity_type === "planted") {
                    stats.planted++;
                } else if (activity.activity_type === "harvested") {
                    stats.harvested++;
                }
            });

            // Build plant stats array
            const stats: PlantStats[] = plants.map((plant: any) => {
                const activityStats = statsMap.get(plant.id) || { planted: 0, harvested: 0 };
                return {
                    plantId: plant.id,
                    plantName: plant.name,
                    timesPlanted: activityStats.planted,
                    timesHarvested: activityStats.harvested,
                    growthTimeHours: plant.growth_time_hours || 0,
                    harvestPoints: plant.harvest_points || 10,
                    weatherBonus: plant.weather_bonus || { sunny: 1, cloudy: 1, rainy: 1 },
                };
            });

            setPlantStats(stats);
        } catch (error) {
            console.error("[GardenProfileModal] Error fetching plant stats:", error);
        } finally {
            setLoadingStats(false);
        }
    }, [userId]);

    // Fetch data when modal opens
    useEffect(() => {
        if (visible && userId) {
            fetchPlantStats();
        }
    }, [visible, userId, fetchPlantStats]);

    // Refresh when trigger changes
    useEffect(() => {
        if (refreshTrigger && visible) {
            fetchPlantStats();
            refreshAchievements();
        }
    }, [refreshTrigger, visible, fetchPlantStats, refreshAchievements]);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onClose();
    };

    const handleTabChange = (tab: "collection" | "achievements") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setActiveTab(tab);
    };

    const toggleStatsExpanded = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setStatsExpanded(!statsExpanded);
    };

    const getPlantImage = (plantName: string) => {
        const key = plantName.toLowerCase().replace(/\s+/g, "_");
        return PLANT_IMAGES[key] || PLANT_IMAGES.sunflower;
    };

    const totalHarvests = plantStats.reduce((sum, p) => sum + p.timesHarvested, 0);

    const renderStatsHeader = () => (
        <TouchableOpacity
            style={styles.statsHeader}
            onPress={toggleStatsExpanded}
            activeOpacity={0.7}
        >
            <View style={styles.statsRow}>
                {/* Level */}
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>Level {xpData?.current_level || 1}</Text>
                    <View style={styles.progressBarSmall}>
                        <View
                            style={[
                                styles.progressFillSmall,
                                { width: `${xpData?.xp_progress || 0}%` },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.statDivider} />

                {/* Points */}
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{currentPoints} pts</Text>
                    <Text style={styles.statLabel}>{totalHarvests} harvests</Text>
                </View>
            </View>

            {/* Expand indicator */}
            <Text style={styles.expandIndicator}>
                {statsExpanded ? "▲ Less" : "▼ More"}
            </Text>
        </TouchableOpacity>
    );

    const renderStatsExpanded = () => {
        if (!statsExpanded) return null;

        return (
            <View style={styles.statsExpanded}>
                {/* XP Section */}
                <View style={styles.expandedSection}>
                    <Text style={styles.expandedSectionTitle}>Earn XP</Text>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Plant a seed</Text>
                        <Text style={styles.expandedValue}>+10 XP</Text>
                    </View>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Harvest a plant</Text>
                        <Text style={styles.expandedValue}>+20 XP</Text>
                    </View>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Plant in friend's garden</Text>
                        <Text style={styles.expandedValue}>+25 XP</Text>
                    </View>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Daily weather check</Text>
                        <Text style={styles.expandedValue}>+5 XP</Text>
                    </View>
                    <Text style={styles.expandedSubtext}>
                        {xpData?.xp_to_next_level || 0} XP to Level {(xpData?.current_level || 1) + 1}
                    </Text>
                </View>

                {/* Points Section */}
                <View style={styles.expandedSection}>
                    <Text style={styles.expandedSectionTitle}>Points</Text>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Harvest plants</Text>
                        <Text style={styles.expandedValueEarn}>+5-25 pts</Text>
                    </View>
                    <View style={styles.expandedRow}>
                        <Text style={styles.expandedLabel}>Plant seeds</Text>
                        <Text style={styles.expandedValueSpend}>-5-15 pts</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === "collection" && styles.tabActive]}
                onPress={() => handleTabChange("collection")}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabText, activeTab === "collection" && styles.tabTextActive]}>
                    Collection
                </Text>
                {activeTab === "collection" && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === "achievements" && styles.tabActive]}
                onPress={() => handleTabChange("achievements")}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabText, activeTab === "achievements" && styles.tabTextActive]}>
                    Achievements
                </Text>
                {activeTab === "achievements" && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
        </View>
    );

    const renderPlantCard = (plant: PlantStats) => {
        const hasHarvested = plant.timesHarvested > 0;
        const imageStyle = hasHarvested ? styles.plantImage : styles.plantImageGrayed;

        return (
            <View
                key={plant.plantId}
                style={[styles.plantCard, hasHarvested && styles.plantCardHarvested]}
            >
                <Image
                    source={getPlantImage(plant.plantName)}
                    style={imageStyle}
                    contentFit="contain"
                />
                <Text style={[styles.plantName, !hasHarvested && styles.plantNameGrayed]}>
                    {plant.plantName}
                </Text>
                <Text style={styles.plantInfo}>
                    {plant.growthTimeHours}h · +{plant.harvestPoints} pts
                </Text>
                <View style={styles.weatherRow}>
                    <Text style={styles.weatherBonus}>
                        ☀️{Math.round(plant.weatherBonus.sunny * 100)}%
                    </Text>
                    <Text style={styles.weatherBonus}>
                        ☁️{Math.round(plant.weatherBonus.cloudy * 100)}%
                    </Text>
                    <Text style={styles.weatherBonus}>
                        🌧️{Math.round(plant.weatherBonus.rainy * 100)}%
                    </Text>
                </View>
                <View style={styles.statsRowSmall}>
                    <Text style={styles.plantStat}>
                        Planted: <Text style={plant.timesPlanted > 0 ? styles.plantStatHighlight : undefined}>{plant.timesPlanted}</Text>
                    </Text>
                    <Text style={styles.plantStat}>
                        Harvested: <Text style={hasHarvested ? styles.plantStatHighlight : undefined}>{plant.timesHarvested}</Text>
                    </Text>
                </View>
            </View>
        );
    };

    const renderCollectionTab = () => {
        if (loadingStats) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.loadingText}>Loading collection...</Text>
                </View>
            );
        }

        return (
            <View style={styles.collectionGrid}>
                {plantStats.map(renderPlantCard)}
            </View>
        );
    };

    const renderAchievementsTab = () => {
        if (achievementsLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.loadingText}>Loading achievements...</Text>
                </View>
            );
        }

        if (achievementsError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to load achievements</Text>
                </View>
            );
        }

        // Calculate total achievements stats
        const totalAchievements = achievements.length;
        const completedAchievements = Object.values(userProgress).filter(p => p.isUnlocked).length;

        return (
            <View style={styles.achievementsContainer}>
                {/* Achievements Summary Header */}
                <View style={styles.achievementsSummary}>
                    <Text style={styles.achievementsSummaryText}>
                        {completedAchievements} of {totalAchievements} unlocked
                    </Text>
                </View>

                {["daily", "milestones", "weather", "social", "collection"].map((category) => {
                    const categoryAchievements = achievements.filter(
                        (achievement) => achievement.category === category
                    );

                    if (categoryAchievements.length === 0) return null;

                    return (
                        <AchievementCategory
                            key={category}
                            category={category}
                            achievements={categoryAchievements}
                            userProgress={userProgress}
                            categoryStats={categoryStats[category] || { total: 0, completed: 0 }}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Close button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>My Garden</Text>
                    </View>

                    {/* Stats Header */}
                    {renderStatsHeader()}
                    {renderStatsExpanded()}

                    {/* Tab Bar */}
                    {renderTabBar()}

                    {/* Tab Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {activeTab === "collection"
                            ? renderCollectionTab()
                            : renderAchievementsTab()}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: screenHeight * 0.85,
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#666",
    },
    header: {
        paddingTop: 20,
        paddingBottom: 12,
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    statsHeader: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#888",
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: "#eee",
        marginHorizontal: 16,
    },
    progressBarSmall: {
        width: 80,
        height: 4,
        backgroundColor: "#eee",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFillSmall: {
        height: "100%",
        backgroundColor: "#888",
        borderRadius: 2,
    },
    expandIndicator: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 12,
        color: "#888",
    },
    statsExpanded: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        backgroundColor: "#fafafa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    expandedSection: {
        marginBottom: 16,
    },
    expandedSectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#444",
        marginBottom: 8,
    },
    expandedRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    expandedLabel: {
        fontSize: 13,
        color: "#666",
    },
    expandedValue: {
        fontSize: 13,
        fontWeight: "500",
        color: "#444",
    },
    expandedValueEarn: {
        fontSize: 13,
        fontWeight: "500",
        color: "#444",
    },
    expandedValueSpend: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
    },
    expandedSubtext: {
        fontSize: 12,
        color: "#888",
        marginTop: 8,
        textAlign: "center",
    },
    tabBar: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        position: "relative",
    },
    tabActive: {
        // Active state handled by indicator and text
    },
    tabText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#999",
    },
    tabTextActive: {
        color: "#222",
        fontWeight: "600",
    },
    tabIndicator: {
        position: "absolute",
        bottom: -1,
        left: "25%",
        right: "25%",
        height: 2,
        backgroundColor: "#222",
        borderRadius: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    collectionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    plantCard: {
        width: "48%",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        alignItems: "center",
    },
    plantCardHarvested: {
        borderColor: "#ddd",
    },
    plantImage: {
        width: 52,
        height: 52,
        marginBottom: 10,
    },
    plantImageGrayed: {
        width: 52,
        height: 52,
        marginBottom: 10,
        opacity: 0.3,
    },
    plantName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#222",
        marginBottom: 4,
        textAlign: "center",
    },
    plantNameGrayed: {
        color: "#999",
    },
    plantInfo: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8,
    },
    weatherRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        marginBottom: 10,
    },
    weatherBonus: {
        fontSize: 10,
        color: "#888",
    },
    statsRowSmall: {
        width: "100%",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
        gap: 2,
    },
    plantStat: {
        fontSize: 11,
        color: "#888",
        textAlign: "center",
    },
    plantStatHighlight: {
        color: "#444",
        fontWeight: "600",
    },
    loadingContainer: {
        padding: 40,
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
    },
    errorContainer: {
        padding: 40,
        alignItems: "center",
    },
    errorText: {
        fontSize: 14,
        color: "#ef4444",
    },
    achievementsContainer: {
        paddingTop: 4,
        paddingBottom: 16,
    },
    achievementsSummary: {
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    achievementsSummaryText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        textAlign: "center",
    },
});

export default GardenProfileModal;
