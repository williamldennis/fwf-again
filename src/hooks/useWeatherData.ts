import { useState, useCallback, useRef, useEffect } from "react";
import { WeatherService, HourlyForecast, DailyForecast, HourlyForGraph, WeatherDataType } from "../services/weatherService";
// @ts-ignore
import tzlookup from "tz-lookup";
// @ts-ignore
import { DateTime } from "luxon";

export interface WeatherData {
    current: any;
    forecast: any[];
    hourly?: HourlyForecast[];
    hourlyForGraph?: HourlyForGraph[];
    daily?: DailyForecast[];
    cityName: string;
    localHour: number;
    backgroundColor: string;
}

export interface WeatherState {
    weather: any | null;
    forecast: any[];
    hourly: HourlyForecast[];
    hourlyForGraph: HourlyForGraph[];
    daily: DailyForecast[];
    cityName: string;
    backgroundColor: string;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

export interface WeatherActions {
    fetchWeatherData: (latitude: number, longitude: number) => Promise<void>;
    refreshWeather: () => Promise<void>;
    clearError: () => void;
}

// Utility function to get background color based on hour
export const getBackgroundColor = (hour: number): string => {
    if (hour >= 6 && hour < 9) return "#FFA500"; // Sunrise orange
    if (hour >= 9 && hour < 18) return "#87CEEB"; // Day blue
    if (hour >= 18 && hour < 21) return "#FF8C00"; // Sunset orange
    return "#191970"; // Night blue
};

// Updated hook: accepts latitude, longitude, and optional userId
export function useWeatherData(
    latitude?: number | null,
    longitude?: number | null,
    userId?: string | null
): WeatherState & WeatherActions {
    const [weather, setWeather] = useState<any | null>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [hourly, setHourly] = useState<HourlyForecast[]>([]);
    const [hourlyForGraph, setHourlyForGraph] = useState<HourlyForGraph[]>([]);
    const [daily, setDaily] = useState<DailyForecast[]>([]);
    const [cityName, setCityName] = useState<string>("");
    const [backgroundColor, setBackgroundColor] = useState<string>("#87CEEB");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const currentLocation = useRef<{ latitude: number; longitude: number } | null>(null);

    // Fetch weather data with caching
    const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
        console.log(`[Weather] 🌤️ Fetching weather for coordinates: ${lat}, ${lon}`);
        setLoading(true);
        setError(null);
        const cachedDataResponse = await WeatherService.getCachedWeatherData(lat, lon, WeatherDataType.Complete);
        if (cachedDataResponse.success && cachedDataResponse.data && cachedDataResponse.data.completeData) {
            console.log("[Weather] ✅ Using cached weather data from DB");
            const cachedData = cachedDataResponse.data.completeData;
            const timestamp = cachedDataResponse.data.timestamp;
            setWeather(cachedData.current);
            setForecast(cachedData.forecast);
            setHourly(cachedData.hourly || []);
            setHourlyForGraph(cachedData.hourlyForGraph || []);
            setDaily(cachedData.daily || []);
            setCityName(cachedData.cityName);
            setBackgroundColor(cachedData.backgroundColor);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
        }
        try {
            console.log("[Weather] 🔄 Fetching fresh weather data...");
            let cityNameResult;
            const cachedCityResponse = await WeatherService.getCachedCityFromCoords(lat, lon);
            if (cachedCityResponse.success && cachedCityResponse.city) {
                cityNameResult = cachedCityResponse.city;
                console.log(`[Weather] ✅ Using cached city name: ${cityNameResult}`);
            } else {
                cityNameResult = await WeatherService.getCityFromCoords(lat, lon);
                console.log(`[Weather] ✅ Fetched city name: ${cityNameResult}, saving to DB cache...`);
                await WeatherService.saveCityCoords(lat, lon, cityNameResult);
            }
            let localHour = 12;
            try {
                const timezone = tzlookup(lat, lon);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
            } catch (e) {
                console.warn("[Weather] ⚠️ Could not determine timezone, using default hour");
            }
            const bgColor = getBackgroundColor(localHour);

            // STEP 1: Fetch main weather data FIRST and show UI immediately
            const weatherData = await WeatherService.fetchWeatherData(lat, lon);
            console.log(`[Weather] ✅ Main weather loaded for ${cityNameResult}`);

            // Set ALL main weather state at once and unblock UI
            setWeather(weatherData.current);
            setForecast(weatherData.forecast);
            setHourly(weatherData.hourly || []);
            setDaily(weatherData.daily || []);
            setCityName(cityNameResult);
            setBackgroundColor(bgColor);
            setLastUpdated(new Date());
            currentLocation.current = { latitude: lat, longitude: lon };
            setLoading(false); // UI UNBLOCKS HERE - user sees content

            console.log(`[Weather] ✅ Weather data fetched successfully for ${cityNameResult}`);

            // STEP 2: Fetch graph data in BACKGROUND (non-blocking)
            WeatherService.fetchWeatherDataForGraph(lat, lon)
                .then(weatherDataForGraph => {
                    console.log("[Weather] ✅ Graph data loaded in background");
                    setHourlyForGraph(weatherDataForGraph.hourly || []);

                    // Save complete data to cache (including graph)
                    const completeWeatherData: WeatherData = {
                        current: weatherData.current,
                        forecast: weatherData.forecast,
                        hourly: weatherData.hourly,
                        hourlyForGraph: weatherDataForGraph.hourly,
                        daily: weatherData.daily,
                        cityName: cityNameResult,
                        localHour,
                        backgroundColor: bgColor,
                    };
                    WeatherService.saveWeatherData(lat, lon, completeWeatherData, WeatherDataType.Complete)
                        .catch(err => console.warn("[Weather] ⚠️ Could not save weather to cache:", err));
                })
                .catch(err => console.warn("[Weather] ⚠️ Graph data fetch failed:", err));

            // Update user in database (background)
            if (userId) {
                WeatherService.updateUserWeatherInDatabase(userId, weatherData, { latitude: lat, longitude: lon })
                    .then(() => console.log("[Weather] ✅ Weather and location updated in database"))
                    .catch(err => console.warn("[Weather] ⚠️ Could not update weather in database:", err));
            }
        } catch (err) {
            console.error("[Weather] ❌ Error fetching weather data:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to fetch weather data: ${errorMessage}`);
            const cachedDataResponse = await WeatherService.getCachedWeatherDataFallback(lat, lon, WeatherDataType.Complete);
            const cachedData = cachedDataResponse.success ? cachedDataResponse.data : null;
            console.log("cachedData", cachedData);
            if (cachedData && cachedData.completeData) {
                console.log("[Weather] 🔄 Falling back to cached data");
                const data = cachedData.completeData;
                setWeather(data.current);
                setForecast(data.forecast);
                setHourly(data.hourly || []);
                setHourlyForGraph(data.hourlyForGraph || []);
                setDaily(data.daily || []);
                setCityName(data.cityName);
                setBackgroundColor(data.backgroundColor);
                setLastUpdated(new Date(cachedData.timestamp));
            }
            // Only set loading false in error case (success case already set it)
            setLoading(false);
        }
    }, [userId]);

    // Refresh weather data (force fresh fetch)
    const refreshWeather = useCallback(async () => {
        if (!currentLocation.current) {
            console.warn("[Weather] ⚠️ No location set, cannot refresh weather");
            return;
        }
        console.log("[Weather] 🔄 Refreshing weather data...");
        await fetchWeatherData(currentLocation.current.latitude, currentLocation.current.longitude);
    }, [fetchWeatherData]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Auto-fetch weather when coordinates change
    useEffect(() => {
        if (typeof latitude === "number" && typeof longitude === "number") {
            console.log(`[Weather] 📍 Coordinates changed to: ${latitude}, ${longitude}`);
            fetchWeatherData(latitude, longitude);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude]);

    return {
        weather,
        forecast,
        hourly,
        hourlyForGraph,
        daily,
        cityName,
        backgroundColor,
        loading,
        error,
        lastUpdated,
        fetchWeatherData,
        refreshWeather,
        clearError,
    };
}

// Backward compatibility: default export for no-arg usage (for friends)
export default useWeatherData; 