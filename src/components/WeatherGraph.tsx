import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import Svg, {
    Path,
    Defs,
    LinearGradient,
    Stop,
    Line,
    Circle,
    Text as SvgText,
    G,
    ClipPath,
    Rect,
} from "react-native-svg";
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
const GRAPH_WIDTH = screenWidth - 40;
const GRAPH_HEIGHT = 180;
const PADDING_LEFT = 25; // Space for left labels
const PADDING_RIGHT = 40;
const PADDING_TOP = 35;
const PADDING_BOTTOM = 25;

const WeatherGraph: React.FC<WeatherGraphProps> = ({
    hourlyForecast,
    hourlyForGraph,
    city,
    width = GRAPH_WIDTH,
    height = GRAPH_HEIGHT,
}) => {
    const [timezone, setTimezone] = React.useState<string>("America/New_York");

    useEffect(() => {
        const getTimeZone = async () => {
            if (!hourlyForecast || hourlyForecast.length === 0) return null;
            if (!hourlyForGraph || hourlyForGraph.length === 0) return null;

            let coordinates: Coordinates | null = null;
            const cachedCoordsResult = await WeatherService.getCachedCoordsFromCity(city);

            if (!cachedCoordsResult.success || !cachedCoordsResult.coordinates) {
                const coordsResult = await WeatherService.getCoordsFromCity(city);
                if (!coordsResult) {
                    setTimezone("America/New_York");
                    return;
                }
                if (coordsResult?.latitude && coordsResult?.longitude) {
                    coordinates = {
                        latitude: coordsResult.latitude,
                        longitude: coordsResult.longitude,
                    };
                    await WeatherService.saveCityCoords(coordsResult.latitude, coordsResult.longitude, city);
                }
            } else {
                coordinates = cachedCoordsResult.coordinates;
            }

            const { latitude, longitude } = coordinates || { latitude: 40.7152, longitude: -73.9467 };
            const tz = tzlookup(latitude, longitude);
            setTimezone(tz);
        };
        getTimeZone();
    }, [city]);

    const chartData = useMemo(() => {
        if (!hourlyForGraph || hourlyForGraph.length === 0) return null;

        const data = hourlyForGraph.slice(0, 25);
        const temps = data.map((h) => h.temp);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);

        // Add buffer to Y-axis range (10% above and below)
        const tempRange = maxTemp - minTemp || 1;
        const buffer = tempRange * 0.15;
        const yMin = minTemp - buffer;
        const yMax = maxTemp + buffer;
        const yRange = yMax - yMin;

        // Find high and low indices
        const highIndex = temps.indexOf(maxTemp);
        const lowIndex = temps.indexOf(minTemp);

        // Calculate current hour index
        const now = DateTime.now().setZone(timezone);
        let currentIndex = -1;

        for (let i = 0; i < data.length; i++) {
            const dt = DateTime.fromSeconds(data[i].dt, { zone: timezone });
            if (dt.hour === now.hour && dt.day === now.day) {
                currentIndex = i;
                break;
            }
        }

        // Chart dimensions
        const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
        const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
        const pointSpacing = chartWidth / (data.length - 1);

        // Generate points with buffered Y range
        const points = data.map((hour, i) => {
            const x = PADDING_LEFT + i * pointSpacing;
            const normalizedTemp = (hour.temp - yMin) / yRange;
            const y = PADDING_TOP + chartHeight - normalizedTemp * chartHeight;
            return { x, y, temp: hour.temp, hour };
        });

        // Generate smooth bezier curve path
        const generateSmoothPath = (pts: typeof points, startIdx = 0, endIdx = pts.length) => {
            const subset = pts.slice(startIdx, endIdx);
            if (subset.length < 2) return "";

            let path = `M ${subset[0].x} ${subset[0].y}`;

            for (let i = 0; i < subset.length - 1; i++) {
                const actualIdx = startIdx + i;
                const p0 = pts[Math.max(0, actualIdx - 1)];
                const p1 = pts[actualIdx];
                const p2 = pts[Math.min(pts.length - 1, actualIdx + 1)];
                const p3 = pts[Math.min(pts.length - 1, actualIdx + 2)];

                const tension = 0.3;
                const cp1x = p1.x + (p2.x - p0.x) * tension;
                const cp1y = p1.y + (p2.y - p0.y) * tension;
                const cp2x = p2.x - (p3.x - p1.x) * tension;
                const cp2y = p2.y - (p3.y - p1.y) * tension;

                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }

            return path;
        };

        // Generate full path
        const fullPath = generateSmoothPath(points);

        // Generate area fill path
        const generateAreaPath = (linePath: string, pts: typeof points) => {
            const bottomY = PADDING_TOP + chartHeight;
            return `${linePath} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
        };

        // Generate time labels
        const timeLabels = data.map((hour, i) => {
            const dt = DateTime.fromSeconds(hour.dt, { zone: timezone });
            const h = dt.hour;

            if (h === 0) return { label: "12AM", x: points[i].x };
            if (h === 6) return { label: "6AM", x: points[i].x };
            if (h === 12) return { label: "12PM", x: points[i].x };
            if (h === 18) return { label: "6PM", x: points[i].x };
            return null;
        }).filter(Boolean);

        return {
            points,
            fullPath,
            areaPath: generateAreaPath(fullPath, points),
            minTemp,
            maxTemp,
            yMin,
            yMax,
            highIndex,
            lowIndex,
            currentIndex,
            timeLabels,
            chartHeight,
            data,
        };
    }, [hourlyForGraph, timezone, width, height]);

    if (!hourlyForecast || hourlyForecast.length === 0) return null;
    if (!hourlyForGraph || hourlyForGraph.length === 0) return null;
    if (!chartData) return null;

    const { points, fullPath, areaPath, minTemp, maxTemp, yMin, yMax, highIndex, lowIndex, currentIndex, timeLabels, chartHeight, data } = chartData;

    // Get weather icon URL
    const getWeatherIconUrl = (icon: string) => {
        return `https://openweathermap.org/img/wn/${icon}@2x.png`;
    };

    // Calculate icon positions (show every 3 hours for clarity)
    const iconIndices = [0, 3, 6, 9, 12, 15, 18, 21, 24].filter(i => i < data.length);

    // Precipitation data
    const precipData = data.map((h) => (h.pop || 0) * 100);

    // Calculate current X position for clipping
    const currentX = currentIndex >= 0 && currentIndex < points.length
        ? points[currentIndex].x
        : points[0].x;

    return (
        <View style={styles.container}>
            {/* Temperature Section */}
            <View style={styles.section}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Temperature</Text>
                    <Text style={styles.tempRange}>
                        H:{Math.round(maxTemp)}° L:{Math.round(minTemp)}°
                    </Text>
                </View>

                {/* Weather Icons Row */}
                <View style={styles.iconRow}>
                    {iconIndices.map((i) => {
                        const hour = data[i];
                        const icon = hour.weather?.[0]?.icon || "01d";
                        const isPast = currentIndex >= 0 && i < currentIndex;
                        const isNow = i === currentIndex || (currentIndex >= 0 && i === currentIndex + 1) ||
                                      (currentIndex >= 0 && i === currentIndex + 2 && currentIndex + 2 < data.length);

                        return (
                            <View
                                key={i}
                                style={[
                                    styles.iconContainer,
                                    isPast && styles.iconContainerPast,
                                ]}
                            >
                                <Image
                                    source={{ uri: getWeatherIconUrl(icon) }}
                                    style={[
                                        styles.weatherIcon,
                                        isPast && styles.weatherIconPast,
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                        );
                    })}
                </View>

                {/* SVG Chart */}
                <Svg width={width} height={height}>
                    <Defs>
                        {/* Temperature gradient - teal to blue like Apple */}
                        <LinearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#4DD0E1" stopOpacity="0.8" />
                            <Stop offset="50%" stopColor="#26C6DA" stopOpacity="0.5" />
                            <Stop offset="100%" stopColor="#0288D1" stopOpacity="0.3" />
                        </LinearGradient>

                        {/* Faded gradient for past */}
                        <LinearGradient id="tempGradientPast" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#B0BEC5" stopOpacity="0.4" />
                            <Stop offset="50%" stopColor="#90A4AE" stopOpacity="0.25" />
                            <Stop offset="100%" stopColor="#78909C" stopOpacity="0.15" />
                        </LinearGradient>

                        {/* Clip path for past (before now) */}
                        <ClipPath id="clipPast">
                            <Rect x={0} y={0} width={currentX} height={height} />
                        </ClipPath>

                        {/* Clip path for future (now and after) */}
                        <ClipPath id="clipFuture">
                            <Rect x={currentX} y={0} width={width - currentX} height={height} />
                        </ClipPath>
                    </Defs>

                    {/* Horizontal grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <Line
                            key={i}
                            x1={PADDING_LEFT}
                            y1={PADDING_TOP + chartHeight * ratio}
                            x2={width - PADDING_RIGHT}
                            y2={PADDING_TOP + chartHeight * ratio}
                            stroke="#E0E0E0"
                            strokeWidth={0.5}
                            strokeDasharray={i > 0 && i < 4 ? "4,4" : "0"}
                        />
                    ))}

                    {/* "Now" indicator - vertical line */}
                    {currentIndex >= 0 && currentIndex < points.length && (
                        <Line
                            x1={points[currentIndex].x}
                            y1={PADDING_TOP - 5}
                            x2={points[currentIndex].x}
                            y2={PADDING_TOP + chartHeight + 5}
                            stroke="#666"
                            strokeWidth={1}
                            strokeDasharray="4,4"
                        />
                    )}

                    {/* Past area fill (faded) */}
                    <G clipPath="url(#clipPast)">
                        <Path d={areaPath} fill="url(#tempGradientPast)" />
                        <Path
                            d={fullPath}
                            fill="none"
                            stroke="#90A4AE"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </G>

                    {/* Future area fill (vibrant) */}
                    <G clipPath="url(#clipFuture)">
                        <Path d={areaPath} fill="url(#tempGradient)" />
                        <Path
                            d={fullPath}
                            fill="none"
                            stroke="#00ACC1"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </G>

                    {/* Current position dot */}
                    {currentIndex >= 0 && currentIndex < points.length && (
                        <G>
                            <Circle
                                cx={points[currentIndex].x}
                                cy={points[currentIndex].y}
                                r={6}
                                fill="#fff"
                                stroke="#00ACC1"
                                strokeWidth={2}
                            />
                            <Circle
                                cx={points[currentIndex].x}
                                cy={points[currentIndex].y}
                                r={3}
                                fill="#00ACC1"
                            />
                        </G>
                    )}

                    {/* High marker */}
                    {highIndex >= 0 && (
                        <G>
                            <Circle
                                cx={points[highIndex].x}
                                cy={points[highIndex].y}
                                r={4}
                                fill="#fff"
                                stroke={highIndex < currentIndex ? "#90A4AE" : "#00ACC1"}
                                strokeWidth={1.5}
                            />
                            <SvgText
                                x={points[highIndex].x}
                                y={points[highIndex].y - 10}
                                fontSize={11}
                                fontWeight="600"
                                fill={highIndex < currentIndex ? "#90A4AE" : "#333"}
                                textAnchor="middle"
                            >
                                H
                            </SvgText>
                        </G>
                    )}

                    {/* Low marker */}
                    {lowIndex >= 0 && lowIndex !== highIndex && (
                        <G>
                            <Circle
                                cx={points[lowIndex].x}
                                cy={points[lowIndex].y}
                                r={4}
                                fill="#fff"
                                stroke={lowIndex < currentIndex ? "#90A4AE" : "#00ACC1"}
                                strokeWidth={1.5}
                            />
                            <SvgText
                                x={points[lowIndex].x}
                                y={points[lowIndex].y + 16}
                                fontSize={11}
                                fontWeight="600"
                                fill={lowIndex < currentIndex ? "#90A4AE" : "#333"}
                                textAnchor="middle"
                            >
                                L
                            </SvgText>
                        </G>
                    )}

                    {/* Time labels */}
                    {timeLabels.map((item: any, i: number) => {
                        const isPast = currentIndex >= 0 && item.x < currentX;
                        return (
                            <SvgText
                                key={i}
                                x={item.x}
                                y={PADDING_TOP + chartHeight + 18}
                                fontSize={11}
                                fill={isPast ? "#B0BEC5" : "#666"}
                                textAnchor="middle"
                            >
                                {item.label}
                            </SvgText>
                        );
                    })}

                    {/* Y-axis temperature labels */}
                    <SvgText
                        x={width - 5}
                        y={PADDING_TOP + 4}
                        fontSize={11}
                        fill="#666"
                        textAnchor="end"
                    >
                        {Math.round(yMax)}°
                    </SvgText>
                    <SvgText
                        x={width - 5}
                        y={PADDING_TOP + chartHeight}
                        fontSize={11}
                        fill="#666"
                        textAnchor="end"
                    >
                        {Math.round(yMin)}°
                    </SvgText>
                </Svg>
            </View>

            {/* Precipitation Section */}
            <View style={styles.section}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Chance of Precipitation</Text>
                    <Text style={styles.tempRange}>
                        Today: {Math.round(Math.max(...precipData))}%
                    </Text>
                </View>

                <Svg width={width} height={height - 40}>
                    <Defs>
                        <LinearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#64B5F6" stopOpacity="0.8" />
                            <Stop offset="100%" stopColor="#1976D2" stopOpacity="0.3" />
                        </LinearGradient>
                        <LinearGradient id="precipGradientPast" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#B0BEC5" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#90A4AE" stopOpacity="0.15" />
                        </LinearGradient>
                        <ClipPath id="clipPastPrecip">
                            <Rect x={0} y={0} width={currentX} height={height} />
                        </ClipPath>
                        <ClipPath id="clipFuturePrecip">
                            <Rect x={currentX} y={0} width={width - currentX} height={height} />
                        </ClipPath>
                    </Defs>

                    {/* Horizontal grid lines */}
                    {[0, 0.5, 1].map((ratio, i) => (
                        <Line
                            key={i}
                            x1={PADDING_LEFT}
                            y1={PADDING_TOP + (chartHeight - 40) * ratio}
                            x2={width - PADDING_RIGHT}
                            y2={PADDING_TOP + (chartHeight - 40) * ratio}
                            stroke="#E0E0E0"
                            strokeWidth={0.5}
                            strokeDasharray="4,4"
                        />
                    ))}

                    {/* "Now" indicator for precipitation */}
                    {currentIndex >= 0 && currentIndex < points.length && (
                        <Line
                            x1={points[currentIndex].x}
                            y1={PADDING_TOP - 5}
                            x2={points[currentIndex].x}
                            y2={PADDING_TOP + (chartHeight - 40) + 5}
                            stroke="#666"
                            strokeWidth={1}
                            strokeDasharray="4,4"
                        />
                    )}

                    {/* Precipitation area */}
                    {(() => {
                        const precipChartHeight = chartHeight - 40;
                        const precipPoints = precipData.map((p, i) => {
                            const x = PADDING_LEFT + i * ((width - PADDING_LEFT - PADDING_RIGHT) / (precipData.length - 1));
                            const y = PADDING_TOP + precipChartHeight - (p / 100) * precipChartHeight;
                            return { x, y };
                        });

                        // Generate smooth path
                        let path = `M ${precipPoints[0].x} ${precipPoints[0].y}`;
                        for (let i = 0; i < precipPoints.length - 1; i++) {
                            const p0 = precipPoints[Math.max(0, i - 1)];
                            const p1 = precipPoints[i];
                            const p2 = precipPoints[i + 1];
                            const p3 = precipPoints[Math.min(precipPoints.length - 1, i + 2)];

                            const tension = 0.3;
                            const cp1x = p1.x + (p2.x - p0.x) * tension;
                            const cp1y = p1.y + (p2.y - p0.y) * tension;
                            const cp2x = p2.x - (p3.x - p1.x) * tension;
                            const cp2y = p2.y - (p3.y - p1.y) * tension;

                            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                        }

                        const bottomY = PADDING_TOP + precipChartHeight;
                        const areaPath = `${path} L ${precipPoints[precipPoints.length - 1].x} ${bottomY} L ${precipPoints[0].x} ${bottomY} Z`;

                        return (
                            <G>
                                {/* Past (faded) */}
                                <G clipPath="url(#clipPastPrecip)">
                                    <Path d={areaPath} fill="url(#precipGradientPast)" />
                                    <Path
                                        d={path}
                                        fill="none"
                                        stroke="#90A4AE"
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                    />
                                </G>
                                {/* Future (vibrant) */}
                                <G clipPath="url(#clipFuturePrecip)">
                                    <Path d={areaPath} fill="url(#precipGradient)" />
                                    <Path
                                        d={path}
                                        fill="none"
                                        stroke="#42A5F5"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                    />
                                </G>
                                {/* Current position dot */}
                                {currentIndex >= 0 && currentIndex < precipPoints.length && (
                                    <Circle
                                        cx={precipPoints[currentIndex].x}
                                        cy={precipPoints[currentIndex].y}
                                        r={4}
                                        fill="#fff"
                                        stroke="#42A5F5"
                                        strokeWidth={2}
                                    />
                                )}
                            </G>
                        );
                    })()}

                    {/* Time labels */}
                    {timeLabels.map((item: any, i: number) => {
                        const isPast = currentIndex >= 0 && item.x < currentX;
                        return (
                            <SvgText
                                key={i}
                                x={item.x}
                                y={PADDING_TOP + (chartHeight - 40) + 18}
                                fontSize={11}
                                fill={isPast ? "#B0BEC5" : "#666"}
                                textAnchor="middle"
                            >
                                {item.label}
                            </SvgText>
                        );
                    })}

                    {/* Y-axis labels */}
                    <SvgText
                        x={width - 5}
                        y={PADDING_TOP + 4}
                        fontSize={11}
                        fill="#666"
                        textAnchor="end"
                    >
                        100%
                    </SvgText>
                    <SvgText
                        x={width - 5}
                        y={PADDING_TOP + (chartHeight - 40) / 2}
                        fontSize={11}
                        fill="#666"
                        textAnchor="end"
                    >
                        50%
                    </SvgText>
                    <SvgText
                        x={width - 5}
                        y={PADDING_TOP + (chartHeight - 40)}
                        fontSize={11}
                        fill="#666"
                        textAnchor="end"
                    >
                        0%
                    </SvgText>
                </Svg>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 24,
    },
    section: {
        paddingVertical: 8,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    tempRange: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
    iconRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    iconContainer: {
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    iconContainerPast: {
        opacity: 0.5,
    },
    weatherIcon: {
        width: 28,
        height: 28,
    },
    weatherIconPast: {
        opacity: 0.6,
    },
});

export default WeatherGraph;
