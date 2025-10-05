import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Coordinates, HourlyForecast, HourlyForGraph, WeatherService } from "../services/weatherService";
// @ts-ignore
import tzlookup from "tz-lookup";
import { DateTime } from "luxon";


interface WeatherGraphProps {
    hourlyForecast: HourlyForecast[];
    hourlyForGraph: HourlyForGraph[];
    city: string;
    width?: number;
    height?: number;
}

const { width: screenWidth } = Dimensions.get("window");
const GRAPH_WIDTH = screenWidth - 100; // Account for padding
const GRAPH_HEIGHT = 200;

const WeatherGraph: React.FC<WeatherGraphProps> = ({
    hourlyForecast,
    hourlyForGraph,
    city,
    width = GRAPH_WIDTH,
    height = GRAPH_HEIGHT,
}) => {
    // use local city timezone
    const [timezone, setTimezone] = React.useState<string>("Anerica/New_York");

    useEffect(() => {

        const getTimeZone = async () => {
            if (!hourlyForecast || hourlyForecast.length === 0) {
                return null;
            }
            if (!hourlyForGraph || hourlyForGraph.length === 0) {
                return null;
            }
            let coordinates: Coordinates | null = null;
            const cachedCoordsResult = await WeatherService.getCachedCoordsFromCity(city);
            if (!cachedCoordsResult.success || !cachedCoordsResult.coordinates) {
                console.log("[WeatherGraph] No cached coordinates found for city, calling geocoding API");
                const coordsResult = await WeatherService.getCoordsFromCity(city);
                if (!coordsResult) {
                    console.log("[WeatherGraph] No result returned for coordinates from city, defaulting to America/New_York");
                    setTimezone("America/New_York");
                    return;
                }
                if (coordsResult && coordsResult.latitude && coordsResult.longitude) {
                    coordinates = {
                        latitude: coordsResult.latitude,
                        longitude: coordsResult.longitude,
                    };
                    console.log("[WeatherGraph] ✅ Coordinates fetched from geocoding API:", coordinates);
                    await WeatherService.saveCityCoords(coordsResult.latitude, coordsResult.longitude, city);
                }
            } else {
                coordinates = cachedCoordsResult.coordinates;
                console.log("[WeatherGraph] ✅ Using cached coordinates for city:", coordinates);
            }
            const { latitude, longitude } = coordinates || { latitude: 40.7152, longitude: -73.9467 };
            const timezone = tzlookup(latitude, longitude);
            setTimezone(timezone);
            console.log(`[WeatherGraph] Setting timezone for ${city} to ${timezone}`);
        }
        getTimeZone();
    }, [city])


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
        const dt = DateTime.fromSeconds(hour.dt, { zone: timezone });
        const hours = dt.hour;
        const currentHour = DateTime.now().setZone(timezone).hour;

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
