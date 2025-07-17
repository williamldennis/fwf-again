import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface HeaderBarProps {
    points: number;
    onMenuPress: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    points,
    onMenuPress,
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

            {/* Right side - Points display */}
            <View style={styles.pointsContainer}>
                <Text style={styles.pointsText}>{points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
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
});

export default HeaderBar;
