import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { BlurView } from "expo-blur";

interface CarouselFooterProps {
    children: React.ReactNode;
}

export const CarouselFooter: React.FC<CarouselFooterProps> = ({ children }) => {
    return (
        <View style={styles.container}>
            <BlurView intensity={20} style={styles.blurContainer}>
                <View style={styles.content}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        style={styles.scrollView}
                    >
                        {children}
                    </ScrollView>
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 100, // Increased height to accommodate the footer
    },
    blurContainer: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 1)", // Subtle white overlay
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 20, // Add some padding from the bottom
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 20, // Add some padding on the sides
    },
});

export default CarouselFooter;
