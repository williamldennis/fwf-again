import { Text, VStack, HStack, Spacer } from "@expo/ui/swift-ui";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

/**
 * Individual plant data for widget display
 */
export type WidgetPlant = {
    id: string;
    name: string;
    emoji: string;
    growthPercent: number;
    stage: number;
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
 * Get plant emoji based on name
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
 * Small widget - simplified for debugging
 */
const SmallWidget = (props: WeatherWidgetProps) => {
    return (
        <VStack style={{ padding: 12, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 32 }}>
                {props.weatherEmoji || "☀️"}
            </Text>
            <Text style={{ fontSize: 28, fontWeight: "bold" }}>
                {Math.round(props.temperature || 72)}°
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
                {props.cityName || "FWF"}
            </Text>
            <Spacer />
            <Text style={{ fontSize: 14 }}>
                🌱 {props.totalPlants || 0} plants
            </Text>
        </VStack>
    );
};

/**
 * Medium widget - simplified
 */
const MediumWidget = (props: WeatherWidgetProps) => {
    return (
        <HStack style={{ padding: 12 }}>
            <VStack style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 36 }}>
                    {props.weatherEmoji || "☀️"}
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold" }}>
                    {Math.round(props.temperature || 72)}°F
                </Text>
                <Text style={{ fontSize: 11, color: "#888" }}>
                    {props.weatherCondition || "Sunny"}
                </Text>
            </VStack>
            <Spacer />
            <VStack style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "600" }}>
                    Your Garden
                </Text>
                <Text style={{ fontSize: 24 }}>
                    🌱 {props.totalPlants || 0}
                </Text>
                {(props.plantsReady || 0) > 0 && (
                    <Text style={{ fontSize: 12, color: "#4CAF50", fontWeight: "bold" }}>
                        {props.plantsReady} ready!
                    </Text>
                )}
            </VStack>
        </HStack>
    );
};

/**
 * Large widget - simplified
 */
const LargeWidget = (props: WeatherWidgetProps) => {
    const plants = props.plants || [];
    return (
        <VStack style={{ padding: 16 }}>
            <HStack>
                <Text style={{ fontSize: 42 }}>
                    {props.weatherEmoji || "☀️"}
                </Text>
                <VStack style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 32, fontWeight: "bold" }}>
                        {Math.round(props.temperature || 72)}°F
                    </Text>
                    <Text style={{ fontSize: 14, color: "#666" }}>
                        {props.weatherCondition || "Sunny"} in {props.cityName || "Your City"}
                    </Text>
                </VStack>
            </HStack>
            <Spacer />
            <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Garden ({props.totalPlants || 0} plants)
            </Text>
            {plants.length > 0 ? (
                plants.slice(0, 4).map((plant, index) => (
                    <HStack key={plant.id || `plant-${index}`} style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: 16 }}>
                            {plant.emoji || getPlantEmoji(plant.name)}
                        </Text>
                        <Text style={{ fontSize: 14, marginLeft: 8 }}>
                            {plant.name}
                        </Text>
                        <Spacer />
                        <Text style={{ fontSize: 12, color: plant.isReady ? "#4CAF50" : "#888" }}>
                            {plant.isReady ? "Ready!" : `${plant.growthPercent}%`}
                        </Text>
                    </HStack>
                ))
            ) : (
                <Text style={{ fontSize: 13, color: "#888" }}>
                    No plants yet - open app to plant!
                </Text>
            )}
        </VStack>
    );
};

/**
 * Lock screen rectangular widget
 */
const LockScreenWidget = (props: WeatherWidgetProps) => {
    return (
        <HStack>
            <Text style={{ fontSize: 14 }}>
                {props.weatherEmoji || "☀️"} {Math.round(props.temperature || 72)}°
            </Text>
            <Spacer />
            <Text style={{ fontSize: 14 }}>
                🌱 {props.totalPlants || 0}
            </Text>
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
                {props.weatherEmoji || "☀️"}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                {Math.round(props.temperature || 72)}°
            </Text>
        </VStack>
    );
};

/**
 * Lock screen inline widget
 */
const InlineWidget = (props: WeatherWidgetProps) => {
    return (
        <Text>
            {props.weatherEmoji || "☀️"} {Math.round(props.temperature || 72)}° | 🌱 {props.totalPlants || 0}
        </Text>
    );
};

/**
 * Main widget component
 */
const WeatherWidget = (props: WeatherWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const { widgetFamily } = environment;

    // Ensure all props have defaults
    const safeProps: WeatherWidgetProps = {
        temperature: props?.temperature ?? 72,
        weatherCondition: props?.weatherCondition ?? "Sunny",
        weatherEmoji: props?.weatherEmoji ?? "☀️",
        cityName: props?.cityName ?? "FWF",
        plants: props?.plants ?? [],
        totalPlants: props?.totalPlants ?? 0,
        plantsReady: props?.plantsReady ?? 0,
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
