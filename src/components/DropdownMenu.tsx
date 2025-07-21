import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { router } from "expo-router";

interface DropdownMenuProps {
    visible: boolean;
    onClose: () => void;
    onRefreshContacts: () => void;
    onRefreshGrowth: () => void;
    onRefreshLocation?: () => void;
    onLogout: () => void;
    refreshingContacts: boolean;
    onTestSentry?: () => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
    visible,
    onClose,
    onRefreshContacts,
    onRefreshGrowth,
    onRefreshLocation,
    onLogout,
    refreshingContacts,
    onTestSentry,
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                }}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        paddingTop: 100,
                        paddingLeft: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "white",
                            borderRadius: 8,
                            padding: 16,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                            minWidth: 150,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                router.replace("/selfie");
                            }}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: "#f0f0f0",
                            }}
                        >
                            <Text style={{ fontSize: 16, color: "#333" }}>
                                Retake Selfies
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onRefreshContacts();
                            }}
                            disabled={refreshingContacts}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: "#f0f0f0",
                                opacity: refreshingContacts ? 0.5 : 1,
                            }}
                        >
                            <Text style={{ fontSize: 16, color: "#333" }}>
                                {refreshingContacts
                                    ? "Refreshing..."
                                    : "Refresh Contacts"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onRefreshGrowth();
                            }}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: "#f0f0f0",
                            }}
                        >
                            <Text style={{ fontSize: 16, color: "#333" }}>
                                Refresh Plant Growth
                            </Text>
                        </TouchableOpacity>
                        {onRefreshLocation && (
                            <TouchableOpacity
                                onPress={() => {
                                    onClose();
                                    onRefreshLocation();
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#f0f0f0",
                                }}
                            >
                                <Text style={{ fontSize: 16, color: "#333" }}>
                                    Refresh Location
                                </Text>
                            </TouchableOpacity>
                        )}
                        {onTestSentry && (
                            <TouchableOpacity
                                onPress={() => {
                                    onClose();
                                    onTestSentry();
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#f0f0f0",
                                }}
                            >
                                <Text
                                    style={{ fontSize: 16, color: "#007AFF" }}
                                >
                                    Test Sentry
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onLogout();
                            }}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                            }}
                        >
                            <Text style={{ fontSize: 16, color: "#ff4444" }}>
                                Logout
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

export default DropdownMenu;
