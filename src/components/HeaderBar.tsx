import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface HeaderBarProps {
    points: number;
    onMenuPress: () => void;
    onXPPress?: () => void;
    onPointsPress?: () => void;
    onActivityLogPress?: () => void;
    xpData?: {
        total_xp: number;
        current_level: number;
        xp_to_next_level: number;
        xp_progress: number;
    } | null;
    hasNewActivities: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    points,
    onMenuPress,
    onXPPress,
    onPointsPress,
    onActivityLogPress,
    xpData,
    hasNewActivities,
}) => {
    return (
        <View style={styles.container}>
            {/* Left side - Menu button */}
            <TouchableOpacity
                style={styles.menuButton}
                onPress={onMenuPress}
                activeOpacity={0.7}
            >
                <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>

            {/* Right side - XP and Points display */}
            <View style={styles.rightContainer}>
                {/* XP Display */}
                {xpData && (
                    <TouchableOpacity
                        style={styles.xpContainer}
                        onPress={onXPPress}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.xpText}>
                            Level {xpData.current_level}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Points Display */}
                <TouchableOpacity
                    style={styles.pointsContainer}
                    onPress={onPointsPress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.pointsText}>{points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                </TouchableOpacity>

                {/* Activity Log Button */}
                <TouchableOpacity
                    style={styles.activityLogButton}
                    onPress={onActivityLogPress}
                    activeOpacity={0.7}
                >
                    <Text style={styles.activityLogIcon}>🔔</Text>
                    {/* {hasNewActivities && ( */}
                    <View style={styles.redDot} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 60, // Add extra padding to account for status bar
        backgroundColor: "rgba(255, 255, 255, 0.0)",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 1000,
    },
    menuButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        minWidth: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    menuIcon: {
        fontSize: 20,
        color: "#007AFF",
        fontWeight: "600",
    },
    pointsContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 60,
        justifyContent: "center",
    },
    pointsText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#007AFF",
        marginRight: 2,
    },
    pointsLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: "#007AFF",
        opacity: 0.8,
    },
    rightContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    xpContainer: {
        alignItems: "center",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        minWidth: 70,
        justifyContent: "center",
        flexDirection: "row",
    },
    xpText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#006400",
        marginBottom: 0,
        opacity: 0.8,
    },
    levelText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#006400",
        opacity: 1,
    },
    activityLogButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "rgba(255, 193, 7, 0.1)",
        minWidth: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    activityLogIcon: {
        fontSize: 20,
        color: "#FFC107",
        fontWeight: "600",
    },
    redDot: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 5,
        backgroundColor: "#c31313ff",
        zIndex: 1,
    },
});

export default HeaderBar;
