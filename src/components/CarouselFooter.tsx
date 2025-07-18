import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";

interface CarouselFooterProps {
    children: React.ReactNode;
}

export const CarouselFooter: React.FC<CarouselFooterProps> = ({ children }) => {
    return (
        <View style={styles.container}>
            <View style={styles.footerContainer}>
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
            </View>
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
        zIndex: 1000, // Ensure it appears above other content
    },
    footerContainer: {
        flex: 1,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#E5E5E5", // Light grey border
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
