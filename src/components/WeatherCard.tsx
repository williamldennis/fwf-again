import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { HourlyForecast, DailyForecast } from "../services/weatherService";
import { getWeatherDisplayName } from "../utils/weatherUtils";
import WeatherModal from "./WeatherModal";

interface WeatherCardProps {
    currentWeather: any;
    hourlyForecast: HourlyForecast[];
    dailyForecast: DailyForecast[];
    cityName: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
    currentWeather,
    hourlyForecast,
    dailyForecast,
    cityName,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleCardPress = () => {
        setModalVisible(true);
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
        width: "100%",
        marginTop: 10,
        marginBottom: 0,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
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

export default WeatherCard;
