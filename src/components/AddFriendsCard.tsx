import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import sunCloudTrans from "../../assets/images/sun-cloud-trans.png";

interface AddFriendsCardProps {
    onShare: () => void;
    cardWidth: number;
}

export const AddFriendsCard: React.FC<AddFriendsCardProps> = ({
    onShare,
    cardWidth,
}) => {
    return (
        <TouchableOpacity
            onPress={onShare}
            style={{
                width: cardWidth,
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
                height: 240, // Match the height of friend cards
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
    );
};

export default AddFriendsCard;
