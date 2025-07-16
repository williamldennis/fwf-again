import { useState, useCallback, useRef, useEffect } from "react";
import { WeatherService } from "../services/weatherService";
import { supabase } from "../utils/supabase";
// @ts-ignore
import tzlookup from "tz-lookup";
// @ts-ignore
import { DateTime } from "luxon";

export interface WeatherData {
    current: any;
    forecast: any[];
    cityName: string;
    localHour: number;
    backgroundColor: string;
}

export interface WeatherState {
    weather: any | null;
    forecast: any[];
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

// Refactored hook: accepts latitude, longitude, and trigger (e.g., isInitialized)
export function useWeatherData(
    latitude?: number | null,
    longitude?: number | null,
    trigger?: boolean,
    userId?: string | null
): WeatherState & WeatherActions {
    const [weather, setWeather] = useState<any | null>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [cityName, setCityName] = useState<string>("");
    const [backgroundColor, setBackgroundColor] = useState<string>("#87CEEB");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    const currentLocation = useRef<{ latitude: number; longitude: number } | null>(null);

    // Fetch weather data with caching
    const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
        setLoading(true);
        setError(null);
        const cacheKey = getCacheKey(lat, lon);
        const cachedData = weatherCache.get(cacheKey);
        if (cachedData && isCacheValid(cachedData.timestamp)) {
            setWeather(cachedData.data.current);
            setForecast(cachedData.data.forecast);
            setCityName(cachedData.data.cityName);
            setBackgroundColor(cachedData.data.backgroundColor);
            setLastUpdated(new Date(cachedData.timestamp));
            setLoading(false);
            return;
        }
        try {
            const cityNameResult = await WeatherService.getCityFromCoords(lat, lon);
            let localHour = 12;
            try {
                const timezone = tzlookup(lat, lon);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
            } catch (e) {}
            const bgColor = getBackgroundColor(localHour);
            const weatherData = await WeatherService.fetchWeatherData(lat, lon);
            const completeWeatherData: WeatherData = {
                current: weatherData.current,
                forecast: weatherData.forecast,
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
            setCityName(cityNameResult);
            setBackgroundColor(bgColor);
            setLastUpdated(new Date());
            currentLocation.current = { latitude: lat, longitude: lon };
            
            // Update user's weather in database if userId is provided
            if (userId) {
                try {
                    console.log("[Weather] 💾 Updating user's weather in database...");
                    await WeatherService.updateUserWeatherInDatabase(userId, weatherData);
                    console.log("[Weather] ✅ Weather updated in database");
                } catch (err) {
                    console.warn("[Weather] ⚠️ Could not update weather in database:", err);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to fetch weather data: ${errorMessage}`);
            if (cachedData) {
                setWeather(cachedData.data.current);
                setForecast(cachedData.data.forecast);
                setCityName(cachedData.data.cityName);
                setBackgroundColor(cachedData.data.backgroundColor);
                setLastUpdated(new Date(cachedData.timestamp));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh weather data (force fresh fetch)
    const refreshWeather = useCallback(async () => {
        if (!currentLocation.current) return;
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

    // New: Fetch weather when coordinates or trigger change
    useEffect(() => {
        if (typeof latitude === "number" && typeof longitude === "number" && trigger) {
            fetchWeatherData(latitude, longitude);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude, trigger]);

    return {
        weather,
        forecast,
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