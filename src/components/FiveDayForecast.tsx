import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface DailyForecast {
    date: string; // ISO date string
    icon: string; // OpenWeatherMap icon code
    high: number;
    low: number;
}

interface FiveDayForecastProps {
    forecastData: DailyForecast[];
    style?: any;
}

const getDayLabel = (date: string, idx: number) => {
    if (idx === 0) return "Today";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short" });
};

const FiveDayForecast: React.FC<FiveDayForecastProps> = ({
    forecastData,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            {forecastData.map((day, idx) => (
                <View key={day.date} style={styles.column}>
                    <Text style={styles.dayLabel}>
                        {getDayLabel(day.date, idx)}
                    </Text>
                    <Image
                        source={{
                            uri: `https://openweathermap.org/img/wn/${day.icon}@2x.png`,
                        }}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text
                        style={styles.temp}
                    >{`${Math.round(day.low)}° / ${Math.round(day.high)}°`}</Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "transparent",
        borderRadius: 18,
        padding: 12,
        marginTop: 10,
        marginBottom: 10,
    },
    column: {
        flex: 1,
        alignItems: "center",
    },
    dayLabel: {
        fontWeight: "bold",
        fontSize: 15,
        marginBottom: 2,
    },
    icon: {
        width: 36,
        height: 36,
        marginBottom: 2,
    },
    temp: {
        fontSize: 12,
        color: "#333",
    },
});

export default FiveDayForecast;
