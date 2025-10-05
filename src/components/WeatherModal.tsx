import React from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    StyleSheet,
} from "react-native";
import { HourlyForecast, DailyForecast, HourlyForGraph } from "../services/weatherService";
import WeatherGraph from "./WeatherGraph";

interface WeatherModalProps {
    visible: boolean;
    onClose: () => void;
    currentWeather: any;
    hourlyForecast: HourlyForecast[];
    hourlyForGraph: HourlyForGraph[];
    dailyForecast: DailyForecast[];
    cityName: string;
}

const { width } = Dimensions.get("window");

const WeatherModal: React.FC<WeatherModalProps> = ({
    visible,
    onClose,
    currentWeather,
    hourlyForecast,
    hourlyForGraph,
    dailyForecast,
    cityName,
}) => {
    // console.log("[WeatherModal] hourlyForecast", hourlyForecast); // Debugging line
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
        });
    };

    const formatDay = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow";
        } else {
            return date.toLocaleDateString("en-US", { weekday: "short" });
        }
    };

    const getWeatherDescription = (weather: any) => {
        if (!weather || !weather[0]) return "";
        return (
            weather[0].description.charAt(0).toUpperCase() +
            weather[0].description.slice(1)
        );
    };

    const getWeatherIcon = (weather: any) => {
        if (!weather || !weather[0]) return "";
        return `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    };

    const formatPrecipitation = (pop: number) => {
        return `${Math.round(pop * 100)}%`;
    };

    const formatUV = (uvi: number) => {
        if (uvi <= 2) return "Low";
        if (uvi <= 5) return "Moderate";
        if (uvi <= 7) return "High";
        if (uvi <= 10) return "Very High";
        return "Extreme";
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Weather Details</Text>
                    <Text style={styles.headerSubtitle}>{cityName}</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Weather Graphs */}
                    {hourlyForecast.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Today's Forecast
                            </Text>
                            <WeatherGraph hourlyForecast={hourlyForecast} hourlyForGraph={hourlyForGraph} city={cityName} />
                        </View>
                    )}

                    {/* Daily Forecast */}
                    {dailyForecast.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                7-Day Forecast
                            </Text>
                            {dailyForecast.map((day) => (
                                <View key={day.dt} style={styles.dailyItem}>
                                    <View style={styles.dailyLeft}>
                                        <Text style={styles.dailyDay}>
                                            {formatDay(day.dt)}
                                        </Text>
                                        <Text style={styles.dailyDescription}>
                                            {getWeatherDescription(day.weather)}
                                        </Text>
                                        {day.pop > 0.1 && (
                                            <Text style={styles.dailyPop}>
                                                {formatPrecipitation(day.pop)}{" "}
                                                chance of rain
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.dailyCenter}>
                                        <Image
                                            source={{
                                                uri: getWeatherIcon(
                                                    day.weather
                                                ),
                                            }}
                                            style={styles.dailyIcon}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={styles.dailyRight}>
                                        <Text style={styles.dailyHigh}>
                                            {Math.round(day.temp.max)}°
                                        </Text>
                                        <Text style={styles.dailyLow}>
                                            {Math.round(day.temp.min)}°
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* UV Index and Additional Info */}
                    {dailyForecast.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Additional Information
                            </Text>
                            <View style={styles.additionalInfo}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>
                                        UV Index
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {dailyForecast[0].uvi} (
                                        {formatUV(dailyForecast[0].uvi)})
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>
                                        Sunrise
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        6:30 AM
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Sunset</Text>
                                    <Text style={styles.infoValue}>
                                        8:15 PM
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        backgroundColor: "#fff",
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
        alignItems: "center",
        position: "relative",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#212529",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6c757d",
    },
    closeButton: {
        position: "absolute",
        top: 60,
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#f8f9fa",
        alignItems: "center",
        justifyContent: "center",
    },
    closeButtonText: {
        fontSize: 18,
        color: "#6c757d",
        fontWeight: "500",
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    currentSection: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    currentMain: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    currentLeft: {
        flex: 1,
    },
    currentTemp: {
        fontSize: 48,
        fontWeight: "300",
        color: "#212529",
        marginBottom: 4,
    },
    currentFeelsLike: {
        fontSize: 16,
        color: "#6c757d",
        marginBottom: 8,
    },
    currentDescription: {
        fontSize: 18,
        color: "#495057",
        fontWeight: "500",
    },
    currentRight: {
        alignItems: "center",
    },
    currentIcon: {
        width: 80,
        height: 80,
    },
    currentDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#e9ecef",
    },
    detailItem: {
        alignItems: "center",
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212529",
    },
    section: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#212529",
        marginBottom: 16,
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
    hourlyIcon: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    hourlyTemp: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212529",
        marginBottom: 4,
    },
    hourlyPop: {
        fontSize: 10,
        color: "#007bff",
        fontWeight: "500",
    },
    dailyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f8f9fa",
    },
    dailyLeft: {
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
    dailyPop: {
        fontSize: 12,
        color: "#007bff",
    },
    dailyCenter: {
        alignItems: "center",
        marginHorizontal: 16,
    },
    dailyIcon: {
        width: 50,
        height: 50,
    },
    dailyRight: {
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
    additionalInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    infoItem: {
        alignItems: "center",
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#212529",
    },
});

export default WeatherModal;
