import { useState, useCallback, useRef, useEffect } from "react";
import { WeatherService, HourlyForecast, DailyForecast, HourlyForGraph } from "../services/weatherService";
import { supabase } from "../utils/supabase";
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

// Cache for weather data (5 minutes)
const WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

// Utility function to get background color based on hour
const getBackgroundColor = (hour: number): string => {
    if (hour >= 6 && hour < 9) return "#FFA500"; // Sunrise orange
    if (hour >= 9 && hour < 18) return "#87CEEB"; // Day blue
    if (hour >= 18 && hour < 21) return "#FF8C00"; // Sunset orange
    return "#191970"; // Night blue
};

// Generate cache key from coordinates
const getCacheKey = (latitude: number, longitude: number): string => {
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
};

// Check if cached data is still valid
const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < WEATHER_CACHE_DURATION;
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
        const cacheKey = getCacheKey(lat, lon);
        const cachedData = weatherCache.get(cacheKey);
        if (cachedData && isCacheValid(cachedData.timestamp)) {
            console.log("[Weather] ✅ Using cached weather data");
            setWeather(cachedData.data.current);
            setForecast(cachedData.data.forecast);
            setHourly(cachedData.data.hourly || []);
            setHourlyForGraph(cachedData.data.hourlyForGraph || []);
            setDaily(cachedData.data.daily || []);
            setCityName(cachedData.data.cityName);
            setBackgroundColor(cachedData.data.backgroundColor);
            setLastUpdated(new Date(cachedData.timestamp));
            setLoading(false);
            return;
        }
        try {
            console.log("[Weather] 🔄 Fetching fresh weather data...");
            const cityNameResult = await WeatherService.getCityFromCoords(lat, lon);
            let localHour = 12;
            try {
                const timezone = tzlookup(lat, lon);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
            } catch (e) {
                console.warn("[Weather] ⚠️ Could not determine timezone, using default hour");
            }
            const bgColor = getBackgroundColor(localHour);
            const weatherData = await WeatherService.fetchWeatherData(lat, lon);
            const weatherDataForGraph = await WeatherService.fetchWeatherDataForGraph(lat, lon);
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
            weatherCache.set(cacheKey, {
                data: completeWeatherData,
                timestamp: Date.now(),
            });
            setWeather(weatherData.current);
            setForecast(weatherData.forecast);
            setHourly(weatherData.hourly || []);
            setHourlyForGraph(weatherDataForGraph.hourly || []);
            setDaily(weatherData.daily || []);
            setCityName(cityNameResult);
            setBackgroundColor(bgColor);
            setLastUpdated(new Date());
            currentLocation.current = { latitude: lat, longitude: lon };

            // Update user's weather and location in database if userId is provided
            if (userId) {
                try {
                    console.log("[Weather] 💾 Updating user's weather and location in database...");
                    await WeatherService.updateUserWeatherInDatabase(userId, weatherData, { latitude: lat, longitude: lon });
                    console.log("[Weather] ✅ Weather and location updated in database");
                } catch (err) {
                    console.warn("[Weather] ⚠️ Could not update weather and location in database:", err);
                }
            }
            console.log(`[Weather] ✅ Weather data fetched successfully for ${cityNameResult}`);
        } catch (err) {
            console.error("[Weather] ❌ Error fetching weather data:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to fetch weather data: ${errorMessage}`);
            if (cachedData) {
                console.log("[Weather] 🔄 Falling back to cached data");
                setWeather(cachedData.data.current);
                setForecast(cachedData.data.forecast);
                setHourly(cachedData.data.hourly || []);
                setHourlyForGraph(cachedData.data.hourlyForGraph || []);
                setDaily(cachedData.data.daily || []);
                setCityName(cachedData.data.cityName);
                setBackgroundColor(cachedData.data.backgroundColor);
                setLastUpdated(new Date(cachedData.timestamp));
            }
        } finally {
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
        const cacheKey = getCacheKey(currentLocation.current.latitude, currentLocation.current.longitude);
        weatherCache.delete(cacheKey);
        await fetchWeatherData(currentLocation.current.latitude, currentLocation.current.longitude);
    }, [fetchWeatherData]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Clean up cache periodically to prevent memory leaks
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, value] of weatherCache.entries()) {
                if (!isCacheValid(value.timestamp)) {
                    weatherCache.delete(key);
                }
            }
        }, 10 * 60 * 1000); // Clean up every 10 minutes
        return () => {
            clearInterval(cleanupInterval);
        };
    }, []);

    // Auto-fetch weather when coordinates change
    useEffect(() => {
        if (typeof latitude === "number" && typeof longitude === "number") {
            console.log(`[Weather] 📍 Coordinates changed to: ${latitude}, ${longitude}`);

            // Clear cache for new coordinates to ensure fresh weather
            const cacheKey = getCacheKey(latitude, longitude);
            if (weatherCache.has(cacheKey)) {
                console.log("[Weather] 🗑️ Clearing cache for new coordinates");
                weatherCache.delete(cacheKey);
            }

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