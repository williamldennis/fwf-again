import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
    Achievement,
    AchievementProgress,
} from "../services/achievementService";

interface AchievementCardProps {
    achievement: Achievement;
    progress: AchievementProgress;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
    achievement,
    progress,
}) => {
    const progressPercentage =
        progress.maxProgress > 0
            ? Math.round(
                  (progress.currentProgress / progress.maxProgress) * 100
              )
            : 0;

    const isCompleted = progress.isUnlocked;
    const hasProgress = progress.currentProgress > 0 && !isCompleted;

    return (
        <View
            style={[
                styles.container,
                isCompleted
                    ? styles.completedContainer
                    : styles.incompleteContainer,
            ]}
        >
            {/* Achievement Header */}
            <View style={styles.header}>
                <Text
                    style={[
                        styles.title,
                        isCompleted
                            ? styles.completedTitle
                            : styles.incompleteTitle,
                    ]}
                >
                    {achievement.name}
                </Text>
                <View style={styles.xpReward}>
                    <Text style={styles.xpText}>{achievement.xpReward} XP</Text>
                </View>
            </View>

            {/* Achievement Description */}
            <Text style={styles.description}>{achievement.description}</Text>

            {/* Progress Section */}
            <View style={styles.progressSection}>
                {isCompleted ? (
                    <View style={styles.completedStatus}>
                        <Text style={styles.completedText}>✅ Completed</Text>
                    </View>
                ) : hasProgress ? (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTextRow}>
                            <Text style={styles.progressText}>
                                {progress.currentProgress} /{" "}
                                {progress.maxProgress}
                            </Text>
                            <Text style={styles.progressPercentage}>
                                {progressPercentage}%
                            </Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progressPercentage}%` },
                                ]}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.noProgress}>
                        <Text style={styles.noProgressText}>
                            0 / {progress.maxProgress}
                        </Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[styles.progressFill, { width: "0%" }]}
                            />
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    completedContainer: {
        borderLeftColor: "#22c55e",
        backgroundColor: "#f0fdf4",
    },
    incompleteContainer: {
        borderLeftColor: "#e5e7eb",
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
        marginRight: 8,
    },
    completedTitle: {
        color: "#16a34a",
    },
    incompleteTitle: {
        color: "#374151",
    },
    xpReward: {
        backgroundColor: "#22c55e",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 50,
        alignItems: "center",
    },
    xpText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#ffffff",
    },
    description: {
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 12,
        lineHeight: 20,
    },
    progressSection: {
        marginTop: 4,
    },
    completedStatus: {
        alignItems: "center",
        paddingVertical: 8,
    },
    completedText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#16a34a",
    },
    progressContainer: {
        marginTop: 4,
    },
    progressTextRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    progressText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
    },
    progressPercentage: {
        fontSize: 12,
        fontWeight: "500",
        color: "#6b7280",
    },
    progressBar: {
        height: 6,
        backgroundColor: "#e5e7eb",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#22c55e",
        borderRadius: 3,
    },
    noProgress: {
        marginTop: 4,
    },
    noProgressText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#9ca3af",
        marginBottom: 6,
    },
});

export default AchievementCard;
