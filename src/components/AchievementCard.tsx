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
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e5e5e5",
    },
    completedContainer: {
        backgroundColor: "#fff",
        borderColor: "#d1d5db",
    },
    incompleteContainer: {
        backgroundColor: "#fff",
        borderColor: "#e5e5e5",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
        marginRight: 8,
    },
    completedTitle: {
        color: "#222",
    },
    incompleteTitle: {
        color: "#222",
    },
    xpReward: {
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    xpText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
    },
    description: {
        fontSize: 13,
        color: "#666",
        marginBottom: 12,
        lineHeight: 18,
    },
    progressSection: {
        marginTop: 4,
    },
    completedStatus: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
    },
    completedText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
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
        fontSize: 13,
        fontWeight: "500",
        color: "#444",
    },
    progressPercentage: {
        fontSize: 12,
        fontWeight: "500",
        color: "#888",
    },
    progressBar: {
        height: 4,
        backgroundColor: "#eee",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#888",
        borderRadius: 2,
    },
    noProgress: {
        marginTop: 4,
    },
    noProgressText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#999",
        marginBottom: 6,
    },
});

export default AchievementCard;
