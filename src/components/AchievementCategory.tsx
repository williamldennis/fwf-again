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

    const completionPercentage =
        categoryStats.total > 0
            ? Math.round((categoryStats.completed / categoryStats.total) * 100)
            : 0;

    return (
        <View style={styles.container}>
            {/* Category Header */}
            <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                    {getCategoryDisplayName(category)}
                </Text>
                <Text style={styles.completionText}>
                    {categoryStats.completed}/{categoryStats.total}
                </Text>
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
    },
    completionText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#888",
    },
    achievementsList: {
        // No additional styling needed - AchievementCard handles its own spacing
    },
});

export default AchievementCategory;
