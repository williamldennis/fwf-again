import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
    Achievement,
    AchievementProgress,
} from "../services/achievementService";
import AchievementCard from "./AchievementCard";

interface AchievementCategoryProps {
    category: string;
    achievements: Achievement[];
    userProgress: Record<string, AchievementProgress>;
    categoryStats: { total: number; completed: number };
}

export const AchievementCategory: React.FC<AchievementCategoryProps> = ({
    category,
    achievements,
    userProgress,
    categoryStats,
}) => {
    const getCategoryDisplayName = (category: string): string => {
        switch (category) {
            case "daily":
                return "Daily";
            case "milestones":
                return "Milestones";
            case "weather":
                return "Weather";
            case "social":
                return "Social";
            case "collection":
                return "Collection";
            default:
                return category.charAt(0).toUpperCase() + category.slice(1);
        }
    };

    const getCategoryColor = (category: string): string => {
        switch (category) {
            case "daily":
                return "#3b82f6"; // Blue
            case "milestones":
                return "#8b5cf6"; // Purple
            case "weather":
                return "#06b6d4"; // Cyan
            case "social":
                return "#ec4899"; // Pink
            case "collection":
                return "#10b981"; // Green
            default:
                return "#6b7280"; // Gray
        }
    };

    const categoryColor = getCategoryColor(category);
    const completionPercentage =
        categoryStats.total > 0
            ? Math.round((categoryStats.completed / categoryStats.total) * 100)
            : 0;

    return (
        <View style={styles.container}>
            {/* Category Header */}
            <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryTitle}>
                        {getCategoryDisplayName(category)}
                    </Text>
                    <View
                        style={[
                            styles.completionBadge,
                            { backgroundColor: categoryColor },
                        ]}
                    >
                        <Text style={styles.completionText}>
                            {categoryStats.completed}/{categoryStats.total}
                        </Text>
                    </View>
                </View>

                {/* Category Progress Bar */}
                <View style={styles.categoryProgressContainer}>
                    <View style={styles.categoryProgressBar}>
                        <View
                            style={[
                                styles.categoryProgressFill,
                                {
                                    width: `${completionPercentage}%`,
                                    backgroundColor: categoryColor,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.categoryProgressText}>
                        {completionPercentage}% complete
                    </Text>
                </View>
            </View>

            {/* Achievement Cards */}
            <View style={styles.achievementsList}>
                {achievements.map((achievement) => (
                    <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        progress={
                            userProgress[achievement.id] || {
                                achievementId: achievement.id,
                                currentProgress: 0,
                                maxProgress: achievement.requirements.target,
                                isUnlocked: false,
                            }
                        }
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    categoryHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    categoryTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
    },
    completionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        minWidth: 60,
        alignItems: "center",
    },
    completionText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#ffffff",
    },
    categoryProgressContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    categoryProgressBar: {
        flex: 1,
        height: 8,
        backgroundColor: "#e5e7eb",
        borderRadius: 4,
        overflow: "hidden",
    },
    categoryProgressFill: {
        height: "100%",
        borderRadius: 4,
    },
    categoryProgressText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#6b7280",
        minWidth: 80,
    },
    achievementsList: {
        // No additional styling needed - AchievementCard handles its own spacing
    },
});

export default AchievementCategory;
