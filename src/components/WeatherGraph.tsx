import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { HourlyForecast, HourlyForGraph } from "../services/weatherService";

interface WeatherGraphProps {
    hourlyForecast: HourlyForecast[];
    hourlyForGraph: HourlyForGraph[];
    width?: number;
    height?: number;
}

const { width: screenWidth } = Dimensions.get("window");
const GRAPH_WIDTH = screenWidth - 100; // Account for padding
const GRAPH_HEIGHT = 200;

const WeatherGraph: React.FC<WeatherGraphProps> = ({
    hourlyForecast,
    hourlyForGraph,
    width = GRAPH_WIDTH,
    height = GRAPH_HEIGHT,
}) => {
    if (!hourlyForecast || hourlyForecast.length === 0) {
        return null;
    }
    if (!hourlyForGraph || hourlyForGraph.length === 0) {
        return null;
    }

    // Filter to 24 hours
    // const data = hourlyForecast.slice(0, 24);
    const data = hourlyForGraph;

    // Calculate temperature range for dynamic Y-axis
    const temps = data.map((hour) => hour.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempBuffer = 20;
    const yAxisMin = Math.floor(minTemp - tempBuffer);
    const yAxisMax = Math.ceil(maxTemp + tempBuffer);

    // Prepare time labels - only show key times
    const timeLabels = data.map((hour) => {
        const date = new Date(hour.dt * 1000);
        const hours = date.getHours();
        const now = new Date();
        const currentHour = now.getHours();

        if (hours === currentHour) return "Now";
        if (hours === 0) return "12AM";
        if (hours === 6) return "6AM";
        if (hours === 12) return "12PM";
        if (hours === 18) return "6PM";
        return "";
    });

    // Prepare temperature data
    const tempData = data.map((hour) => hour.temp);

    // Prepare precipitation data (convert to percentage)
    const precipData = data.map((hour) => hour.pop ? hour.pop * 100 : 0);

    // Temperature chart configuration
    const tempChartConfig = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        strokeWidth: 2,
        propsForVerticalLabels: {
            fontSize: 10,
        },
        propsForHorizontalLabels: {
            fontSize: 10,
        },
    };

    // Precipitation chart configuration
    const precipChartConfig = {
        backgroundColor: "red",
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 180, 216, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        strokeWidth: 2,
        propsForVerticalLabels: {
            fontSize: 10,
        },
        propsForHorizontalLabels: {
            fontSize: 10,
        },
    };

    return (
        <View style={styles.container}>
            {/* Temperature Graph */}
            <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>Temperature</Text>
                <LineChart
                    data={{
                        labels: timeLabels,
                        datasets: [
                            {
                                data: tempData,
                            },
                        ],
                    }}
                    width={width}
                    height={height}
                    chartConfig={tempChartConfig}
                    bezier
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withHorizontalLines={true}
                    withVerticalLines={false}
                    withDots={false}
                    style={styles.chart}
                />
            </View>

            {/* Precipitation Graph */}
            <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>Chance of Precipitation</Text>
                <LineChart
                    data={{
                        labels: timeLabels,
                        datasets: [
                            {
                                data: precipData,
                            },
                        ],
                    }}
                    width={width}
                    height={height}
                    chartConfig={precipChartConfig}
                    bezier
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withHorizontalLines={true}
                    withVerticalLines={false}
                    withDots={false}
                    style={styles.chart}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 20,
    },
    graphContainer: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    graphTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
    },
    chart: {
        marginVertical: 8,
        marginLeft: -10,
        borderRadius: 16,
    },
});

export default WeatherGraph;
