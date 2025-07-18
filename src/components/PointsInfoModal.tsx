import React from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");

interface PointsInfoModalProps {
    visible: boolean;
    onClose: () => void;
    currentPoints: number;
}

export const PointsInfoModal: React.FC<PointsInfoModalProps> = ({
    visible,
    onClose,
    currentPoints,
}) => {
    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
            // Ignore haptic errors
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
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
                        <Text style={styles.title}>💰 Points Guide</Text>
                        <Text style={styles.subtitle}>
                            Your current balance: {currentPoints} pts
                        </Text>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* How to Earn Points */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                🌱 How to Earn Points
                            </Text>

                            <View style={styles.actionItem}>
                                <View style={styles.actionIcon}>
                                    <Text style={styles.actionEmoji}>🌾</Text>
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>
                                        Harvest Plants
                                    </Text>
                                    <Text style={styles.actionDescription}>
                                        Harvest plants when they're fully grown
                                        to earn points
                                    </Text>
                                    <Text style={styles.actionReward}>
                                        +5-25 pts per harvest
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* How to Spend Points */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                🛒 How to Spend Points
                            </Text>

                            <View style={styles.actionItem}>
                                <View style={styles.actionIcon}>
                                    <Text style={styles.actionEmoji}>🌱</Text>
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>
                                        Plant Seeds
                                    </Text>
                                    <Text style={styles.actionDescription}>
                                        Plant in your garden or friends' gardens
                                    </Text>
                                    <Text style={styles.actionCost}>
                                        Cost: 5-15 pts per seed
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.actionItem}>
                                <View style={styles.actionIcon}>
                                    <Text style={styles.actionEmoji}>🚀</Text>
                                </View>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionTitle}>
                                        Boosters (Coming Soon)
                                    </Text>
                                    <Text style={styles.actionDescription}>
                                        Fertilizer, water, and greenhouses
                                    </Text>
                                    <Text style={styles.actionCost}>
                                        Cost: TBD
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Tips */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>💡 Tips</Text>
                            <Text style={styles.tipText}>
                                • Plant in optimal weather conditions for faster
                                growth
                            </Text>
                            <Text style={styles.tipText}>
                                • Visit friends regularly to harvest their
                                plants
                            </Text>
                        </View>
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
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        backgroundColor: "#fff",
        borderRadius: 20,
        width: "90%",
        height: "80%", // Use fixed height instead of maxHeight
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        position: "relative",
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#007AFF",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    scrollView: {
        flex: 1,
        marginTop: 0, // Ensure it starts right after header
    },
    scrollContent: {
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    actionItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#007AFF",
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    actionEmoji: {
        fontSize: 20,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
        lineHeight: 20,
    },
    actionReward: {
        fontSize: 14,
        fontWeight: "600",
        color: "#22c55e",
    },
    actionCost: {
        fontSize: 14,
        fontWeight: "600",
        color: "#007AFF",
    },
    tipText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
        lineHeight: 20,
    },
});

export default PointsInfoModal;
