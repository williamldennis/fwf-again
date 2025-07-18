import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StyleSheet,
} from "react-native";
import { HourlyForecast, DailyForecast } from "../services/weatherService";
import { getWeatherDisplayName } from "../utils/weatherUtils";
import WeatherModal from "./WeatherModal";

interface WeatherCardCarouselProps {
    currentWeather: any;
    hourlyForecast: HourlyForecast[];
    dailyForecast: DailyForecast[];
    cityName: string;
}

const { width: screenWidth } = Dimensions.get("window");

export const WeatherCardCarousel: React.FC<WeatherCardCarouselProps> = ({
    currentWeather,
    hourlyForecast,
    dailyForecast,
    cityName,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const hourlyScrollRef = useRef<ScrollView>(null);

    const handleCardPress = () => {
        setModalVisible(true);
    };

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        const hours = date.getHours();
        if (hours === 0) return "12 AM";
        if (hours === 12) return "12 PM";
        return hours > 12 ? `${hours - 12} PM` : `${hours} AM`;
    };

    const formatDay = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
        return date.toLocaleDateString("en-US", { weekday: "short" });
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.card}
                onPress={handleCardPress}
                activeOpacity={0.8}
            >
                <View style={styles.currentWeatherContent}>
                    <Text style={styles.temperature}>
                        {Math.round(currentWeather?.main?.temp || 0)}°
                    </Text>
                    <Text style={styles.feelsLike}>
                        Feels like{" "}
                        {Math.round(currentWeather?.main?.feels_like || 0)}°
                    </Text>
                    <View style={styles.weatherDescription}>
                        <Text style={styles.weatherText}>
                            It's{" "}
                            {getWeatherDisplayName(
                                currentWeather?.weather?.[0]?.main || "Clear"
                            )}{" "}
                            in {cityName}
                        </Text>
                    </View>
                    <View style={styles.metricsContainer}>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Humidity</Text>
                            <Text style={styles.metricValue}>
                                {currentWeather?.main?.humidity || 0}%
                            </Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Wind</Text>
                            <Text style={styles.metricValue}>
                                {Math.round(currentWeather?.wind?.speed || 0)}{" "}
                                mph
                            </Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>
                                Precipitation
                            </Text>
                            <Text style={styles.metricValue}>
                                {hourlyForecast.length > 0
                                    ? `${Math.round(hourlyForecast[0].pop * 100)}%`
                                    : "0%"}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            <WeatherModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                currentWeather={currentWeather}
                hourlyForecast={hourlyForecast}
                dailyForecast={dailyForecast}
                cityName={cityName}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: screenWidth - 40,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "white",
        textAlign: "center",
        marginBottom: 8,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        minHeight: 200,
    },
    currentWeatherContent: {
        alignItems: "center",
    },
    temperature: {
        fontSize: 48,
        fontWeight: "300",
        color: "#212529",
        marginBottom: 4,
    },
    feelsLike: {
        fontSize: 16,
        color: "#6c757d",
        marginBottom: 8,
    },
    weatherDescription: {
        marginBottom: 20,
    },
    weatherText: {
        fontSize: 18,
        color: "#495057",
        fontWeight: "500",
    },
    metricsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#e9ecef",
        width: "100%",
    },
    metric: {
        alignItems: "center",
        flex: 1,
    },
    metricLabel: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212529",
    },
});
