import { Text, VStack, HStack, Spacer, ProgressView } from "@expo/ui/swift-ui";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

/**
 * Individual plant data for widget display
 */
export type WidgetPlant = {
    id: string;
    name: string;
    emoji: string; // Plant emoji based on type
    growthPercent: number; // 0-100
    stage: number; // 1-5
    isReady: boolean;
    minutesUntilReady?: number;
};

/**
 * Widget data props - this is what gets passed from the main app
 */
export type WeatherWidgetProps = {
    temperature: number;
    weatherCondition: string;
    weatherEmoji: string;
    cityName: string;
    plants: WidgetPlant[];
    totalPlants: number;
    plantsReady: number;
};

/**
 * Get plant emoji based on name (fallback)
 */
const getPlantEmoji = (name: string): string => {
    const nameLower = (name || "").toLowerCase();
    if (nameLower.includes("sunflower")) return "🌻";
    if (nameLower.includes("mushroom")) return "🍄";
    if (nameLower.includes("fern")) return "🌿";
    if (nameLower.includes("cactus")) return "🌵";
    if (nameLower.includes("lily") || nameLower.includes("water")) return "🪷";
    if (nameLower.includes("pine") || nameLower.includes("tree")) return "🌲";
    return "🌱";
};

/**
 * Plant emoji component
 */
const PlantImage = ({ name, size = 24 }: { name: string; size?: number }) => {
    return (
        <Text style={{ fontSize: size * 0.8 }}>
            {getPlantEmoji(name)}
        </Text>
    );
};

/**
 * Get stage indicator
 */
const getStageIndicator = (stage: number, isReady: boolean): string => {
    if (isReady) return "✓";
    if (stage <= 2) return "·";
    if (stage === 3) return "○";
    if (stage === 4) return "◐";
    return "●";
};

/**
 * Plant growth row component
 */
const PlantRow = ({ plant }: { plant: WidgetPlant }) => {
    return (
        <HStack>
            <Text style={{ fontSize: 14 }}>
                {plant.emoji || getPlantEmoji(plant.name)}
            </Text>
            <Text style={{ fontSize: 11, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                {plant.name}
            </Text>
            <Spacer />
            {plant.isReady ? (
                <Text style={{ fontSize: 10, color: "#4CAF50", fontWeight: "bold" }}>
                    Ready!
                </Text>
            ) : (
                <Text style={{ fontSize: 10, color: "#888" }}>
                    {plant.growthPercent}%
                </Text>
            )}
        </HStack>
    );
};

/**
 * Compact plant display for small widget
 */
const PlantIconsRow = ({ plants }: { plants: WidgetPlant[] }) => {
    return (
        <HStack>
            {plants.slice(0, 3).map((plant, index) => (
                <VStack key={plant.id || index} style={{ alignItems: "center", marginRight: 8 }}>
                    <PlantImage name={plant.name} size={28} />
                    <Text style={{
                        fontSize: 9,
                        color: plant.isReady ? "#4CAF50" : "#888",
                        fontWeight: plant.isReady ? "bold" : "normal"
                    }}>
                        {plant.isReady ? "✓" : `${plant.growthPercent}%`}
                    </Text>
                </VStack>
            ))}
        </HStack>
    );
};

/**
 * Small widget - shows temperature and plant icons with growth
 */
const SmallWidget = (props: WeatherWidgetProps) => {
    return (
        <VStack style={{ padding: 12 }}>
            <HStack>
                <Text style={{ fontSize: 28 }}>
                    {props.weatherEmoji}
                </Text>
                <Spacer />
                <VStack style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 24, fontWeight: "bold" }}>
                        {Math.round(props.temperature)}°
                    </Text>
                    <Text style={{ fontSize: 10, color: "#888" }}>
                        {props.cityName}
                    </Text>
                </VStack>
            </HStack>
            <Spacer />
            {props.plants.length > 0 ? (
                <PlantIconsRow plants={props.plants} />
            ) : (
                <Text style={{ fontSize: 12, color: "#888" }}>
                    No plants yet
                </Text>
            )}
            {props.plantsReady > 0 && (
                <Text style={{ fontSize: 10, color: "#4CAF50", fontWeight: "bold", marginTop: 4 }}>
                    {props.plantsReady} ready to harvest!
                </Text>
            )}
        </VStack>
    );
};

/**
 * Medium widget - shows weather and plant list with growth bars
 */
const MediumWidget = (props: WeatherWidgetProps) => {
    return (
        <HStack style={{ padding: 12 }}>
            {/* Weather side */}
            <VStack style={{ width: 100 }}>
                <Text style={{ fontSize: 36 }}>
                    {props.weatherEmoji}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "bold" }}>
                    {Math.round(props.temperature)}°F
                </Text>
                <Text style={{ fontSize: 11, color: "#888" }}>
                    {props.weatherCondition}
                </Text>
                <Text style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                    {props.cityName}
                </Text>
            </VStack>

            <Spacer />

            {/* Plants side */}
            <VStack style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
                    Your Garden
                </Text>
                {props.plants.length > 0 ? (
                    props.plants.slice(0, 3).map((plant, index) => (
                        <VStack key={plant.id || index} style={{ marginBottom: 6 }}>
                            <HStack>
                                <PlantImage name={plant.name} size={18} />
                                <Text style={{ fontSize: 12, marginLeft: 4 }}>
                                    {plant.name}
                                </Text>
                                <Spacer />
                                <Text style={{
                                    fontSize: 10,
                                    color: plant.isReady ? "#4CAF50" : "#888",
                                    fontWeight: plant.isReady ? "bold" : "normal"
                                }}>
                                    {plant.isReady ? "Ready!" : `${plant.growthPercent}%`}
                                </Text>
                            </HStack>
                            {!plant.isReady && (
                                <ProgressView
                                    value={plant.growthPercent / 100}
                                    style={{ height: 4, marginTop: 2 }}
                                />
                            )}
                        </VStack>
                    ))
                ) : (
                    <Text style={{ fontSize: 11, color: "#888" }}>
                        Tap to plant something!
                    </Text>
                )}
            </VStack>
        </HStack>
    );
};

/**
 * Large widget - full detail view
 */
const LargeWidget = (props: WeatherWidgetProps) => {
    return (
        <VStack style={{ padding: 16 }}>
            {/* Weather header */}
            <HStack>
                <Text style={{ fontSize: 42 }}>
                    {props.weatherEmoji}
                </Text>
                <VStack style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 32, fontWeight: "bold" }}>
                        {Math.round(props.temperature)}°F
                    </Text>
                    <Text style={{ fontSize: 14, color: "#666" }}>
                        {props.weatherCondition} in {props.cityName}
                    </Text>
                </VStack>
            </HStack>

            <Spacer />

            {/* Garden section */}
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Your Garden ({props.totalPlants} plants)
            </Text>

            {props.plants.length > 0 ? (
                props.plants.map((plant, index) => (
                    <VStack key={plant.id || index} style={{ marginBottom: 10 }}>
                        <HStack>
                            <PlantImage name={plant.name} size={24} />
                            <Text style={{ fontSize: 14, marginLeft: 8, flex: 1 }}>
                                {plant.name}
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                color: plant.isReady ? "#4CAF50" : "#888",
                                fontWeight: plant.isReady ? "bold" : "normal"
                            }}>
                                {plant.isReady ? "Ready to harvest!" : `${plant.growthPercent}%`}
                            </Text>
                        </HStack>
                        {!plant.isReady && (
                            <ProgressView
                                value={plant.growthPercent / 100}
                                style={{ height: 6, marginTop: 4 }}
                            />
                        )}
                    </VStack>
                ))
            ) : (
                <Text style={{ fontSize: 13, color: "#888", textAlign: "center" }}>
                    No plants in your garden. Open the app to plant something!
                </Text>
            )}

            {props.plantsReady > 0 && (
                <HStack style={{ marginTop: 8, padding: 8, backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, color: "#4CAF50", fontWeight: "bold" }}>
                        {props.plantsReady} plant{props.plantsReady > 1 ? "s" : ""} ready to harvest!
                    </Text>
                </HStack>
            )}
        </VStack>
    );
};

/**
 * Lock screen rectangular widget
 */
const LockScreenWidget = (props: WeatherWidgetProps) => {
    const topPlant = props.plants[0];
    return (
        <HStack>
            <Text style={{ fontSize: 14 }}>
                {props.weatherEmoji} {Math.round(props.temperature)}°
            </Text>
            <Spacer />
            {topPlant ? (
                <HStack>
                    <PlantImage name={topPlant.name} size={16} />
                    <Text style={{ fontSize: 14, marginLeft: 4 }}>
                        {topPlant.isReady ? "Ready!" : `${topPlant.growthPercent}%`}
                    </Text>
                </HStack>
            ) : (
                <Text style={{ fontSize: 14 }}>🌱 No plants</Text>
            )}
        </HStack>
    );
};

/**
 * Lock screen circular widget
 */
const CircularWidget = (props: WeatherWidgetProps) => {
    return (
        <VStack style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18 }}>
                {props.weatherEmoji}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                {Math.round(props.temperature)}°
            </Text>
        </VStack>
    );
};

/**
 * Lock screen inline widget
 */
const InlineWidget = (props: WeatherWidgetProps) => {
    const readyCount = props.plantsReady;
    return (
        <Text>
            {props.weatherEmoji} {Math.round(props.temperature)}° | 🌱 {readyCount > 0 ? `${readyCount} ready` : `${props.totalPlants} growing`}
        </Text>
    );
};

/**
 * Main widget component - renders different layouts based on widget family
 */
const WeatherWidget = (props: WeatherWidgetProps, environment: WidgetEnvironment) => {
    "widget"; // Required directive for expo-widgets

    const { widgetFamily } = environment;

    // Default props for preview/empty state
    const safeProps: WeatherWidgetProps = {
        temperature: props.temperature ?? 72,
        weatherCondition: props.weatherCondition ?? "Sunny",
        weatherEmoji: props.weatherEmoji ?? "☀️",
        cityName: props.cityName ?? "Loading...",
        plants: props.plants ?? [],
        totalPlants: props.totalPlants ?? 0,
        plantsReady: props.plantsReady ?? 0,
    };

    switch (widgetFamily) {
        case "systemSmall":
            return <SmallWidget {...safeProps} />;
        case "systemMedium":
            return <MediumWidget {...safeProps} />;
        case "systemLarge":
            return <LargeWidget {...safeProps} />;
        case "accessoryRectangular":
            return <LockScreenWidget {...safeProps} />;
        case "accessoryCircular":
            return <CircularWidget {...safeProps} />;
        case "accessoryInline":
            return <InlineWidget {...safeProps} />;
        default:
            return <SmallWidget {...safeProps} />;
    }
};

export default createWidget("WeatherWidget", WeatherWidget);
