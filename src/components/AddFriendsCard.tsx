import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import sunCloudTrans from "../../assets/images/sun-cloud-trans.png";

interface AddFriendsCardProps {
    onShare: () => void;
    cardWidth: number;
    cardHeight?: number;
}

export const AddFriendsCard: React.FC<AddFriendsCardProps> = ({
    onShare,
    cardWidth,
    cardHeight,
}) => {
    return (
        <View
            style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 120, // Account for header height
                paddingBottom: 20,
                zIndex: 1,
                height: cardHeight,
                width: cardWidth,
                maxWidth: cardWidth,
            }}
        >
            <TouchableOpacity
                onPress={onShare}
                style={{
                    width: cardWidth - 40, // Reduce width to prevent overflow
                    maxWidth: cardWidth - 40,
                    backgroundColor: "#fffbe6",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                    justifyContent: "center",
                    overflow: "visible",
                    pointerEvents: "auto",
                    zIndex: 100,
                }}
            >
                <Image
                    source={sunCloudTrans}
                    style={{
                        width: 80,
                        height: 80,
                        marginBottom: 16,
                    }}
                    resizeMode="contain"
                />
                <Text
                    style={{
                        color: "#666",
                        textAlign: "center",
                        fontSize: 14,
                        marginBottom: 12,
                    }}
                >
                    Invite your friends to see their weather
                </Text>
                <View
                    style={{
                        backgroundColor: "#fffbe6",
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: "#FFD700",
                        paddingVertical: 8,
                        paddingHorizontal: 20,
                    }}
                >
                    <Text
                        style={{
                            color: "#222",
                            fontWeight: "bold",
                            fontSize: 16,
                        }}
                    >
                        Add Friends
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default AddFriendsCard;
