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

interface WeatherCardCarouselProps {
    currentWeather: any;
    hourlyForecast: HourlyForecast[];
    dailyForecast: DailyForecast[];
    cityName: string;
}

type CardType = "current" | "hourly" | "daily";

const { width: screenWidth } = Dimensions.get("window");

export const WeatherCardCarousel: React.FC<WeatherCardCarouselProps> = ({
    currentWeather,
    hourlyForecast,
    dailyForecast,
    cityName,
}) => {
    const [currentCard, setCurrentCard] = useState<CardType>("current");
    const hourlyScrollRef = useRef<ScrollView>(null);

    // Auto-scroll to current hour when hourly card is shown
    useEffect(() => {
        if (currentCard === "hourly" && hourlyForecast.length > 0) {
            const now = new Date();
            const currentHour = now.getHours();

            // Find the index of the current hour or closest to it
            let currentIndex = 0;
            for (let i = 0; i < hourlyForecast.length; i++) {
                const forecastTime = new Date(hourlyForecast[i].dt * 1000);
                if (forecastTime.getHours() >= currentHour) {
                    currentIndex = i;
                    break;
                }
            }

            // Scroll to current hour with offset
            setTimeout(() => {
                hourlyScrollRef.current?.scrollTo({
                    x: currentIndex * 80, // 80px per hour item
                    animated: true,
                });
            }, 100);
        }
    }, [currentCard, hourlyForecast]);

    const getCardTitle = (cardType: CardType): string => {
        switch (cardType) {
            case "current":
                return "Today's Weather";
            case "hourly":
                return "Hourly Forecast";
            case "daily":
                return "7-Day Forecast";
        }
    };

    const getNavigationText = (): string => {
        switch (currentCard) {
            case "current":
                return "< Hourly Forecast >";
            case "hourly":
                return "< 7-Day Forecast >";
            case "daily":
                return "< Today's Weather >";
        }
    };

    const cycleToNextCard = () => {
        switch (currentCard) {
            case "current":
                setCurrentCard("hourly");
                break;
            case "hourly":
                setCurrentCard("daily");
                break;
            case "daily":
                setCurrentCard("current");
                break;
        }
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

    const renderCurrentWeatherCard = () => (
        <View style={styles.card}>
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
                        {getWeatherDisplayName(
                            currentWeather?.weather?.[0]?.main || "Clear"
                        )}
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
                            {Math.round(currentWeather?.wind?.speed || 0)} mph
                        </Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Pressure</Text>
                        <Text style={styles.metricValue}>
                            {currentWeather?.main?.pressure || 0} hPa
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderHourlyForecastCard = () => (
        <View style={styles.card}>
            <ScrollView
                ref={hourlyScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyContainer}
                style={styles.hourlyScrollView}
            >
                {hourlyForecast.slice(0, 24).map((hour, index) => (
                    <View key={index} style={styles.hourlyItem}>
                        <Text style={styles.hourlyTime}>
                            {index === 0 ? "Now" : formatTime(hour.dt)}
                        </Text>
                        <Text style={styles.hourlyTemp}>
                            {Math.round(hour.temp)}°
                        </Text>
                        <Text style={styles.hourlyDescription}>
                            {getWeatherDisplayName(
                                hour.weather[0]?.main || "Clear"
                            )}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );

    const renderDailyForecastCard = () => (
        <View style={styles.card}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.dailyContainer}
            >
                {dailyForecast.map((day, index) => (
                    <View key={index} style={styles.dailyItem}>
                        <View style={styles.dailyHeader}>
                            <Text style={styles.dailyDay}>
                                {formatDay(day.dt)}
                            </Text>
                            <Text style={styles.dailyDescription}>
                                {getWeatherDisplayName(
                                    day.weather[0]?.main || "Clear"
                                )}
                            </Text>
                        </View>
                        <View style={styles.dailyTemps}>
                            <Text style={styles.dailyHigh}>
                                {Math.round(day.temp.max)}°
                            </Text>
                            <Text style={styles.dailyLow}>
                                {Math.round(day.temp.min)}°
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );

    const renderCurrentCard = () => {
        switch (currentCard) {
            case "current":
                return renderCurrentWeatherCard();
            case "hourly":
                return renderHourlyForecastCard();
            case "daily":
                return renderDailyForecastCard();
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.navigationButton}
                onPress={cycleToNextCard}
                activeOpacity={0.7}
            >
                <Text style={styles.navigationText}>{getNavigationText()}</Text>
            </TouchableOpacity>
            {renderCurrentCard()}
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
    navigationButton: {
        alignItems: "center",
        paddingVertical: 8,
        marginBottom: 10,
    },
    navigationText: {
        fontSize: 16,
        color: "white",
        fontWeight: "600",
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
    hourlyScrollView: {
        flex: 1,
    },
    hourlyContainer: {
        marginHorizontal: -10,
    },
    hourlyItem: {
        alignItems: "center",
        marginHorizontal: 10,
        minWidth: 60,
    },
    hourlyTime: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 8,
    },
    hourlyTemp: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212529",
        marginBottom: 4,
    },
    hourlyDescription: {
        fontSize: 12,
        color: "#6c757d",
        textAlign: "center",
    },
    dailyContainer: {
        paddingVertical: 10,
    },
    dailyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f8f9fa",
    },
    dailyHeader: {
        flex: 1,
    },
    dailyDay: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212529",
        marginBottom: 4,
    },
    dailyDescription: {
        fontSize: 14,
        color: "#6c757d",
        marginBottom: 2,
    },
    dailyTemps: {
        alignItems: "flex-end",
    },
    dailyHigh: {
        fontSize: 18,
        fontWeight: "600",
        color: "#212529",
    },
    dailyLow: {
        fontSize: 16,
        color: "#6c757d",
    },
});
