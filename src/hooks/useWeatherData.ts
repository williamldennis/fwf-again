import { useState, useCallback, useRef, useEffect } from "react";
import { WeatherService } from "../services/weatherService";
import * as Location from "expo-location";
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

export const useWeatherData = (): WeatherState & WeatherActions => {
    const [weather, setWeather] = useState<any | null>(null);
    const [forecast, setForecast] = useState<any[]>([]);
    const [cityName, setCityName] = useState<string>("");
    const [backgroundColor, setBackgroundColor] = useState<string>("#87CEEB");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    const currentLocation = useRef<{ latitude: number; longitude: number } | null>(null);

    // Fetch weather data with caching
    const fetchWeatherData = useCallback(async (latitude: number, longitude: number) => {
        console.log("[Weather] 🌤️ Fetching weather data...");
        setLoading(true);
        setError(null);
        
        const cacheKey = getCacheKey(latitude, longitude);
        const cachedData = weatherCache.get(cacheKey);
        
        // Check if we have valid cached data
        if (cachedData && isCacheValid(cachedData.timestamp)) {
            console.log("[Weather] ✅ Using cached weather data");
            setWeather(cachedData.data.current);
            setForecast(cachedData.data.forecast);
            setCityName(cachedData.data.cityName);
            setBackgroundColor(cachedData.data.backgroundColor);
            setLastUpdated(new Date(cachedData.timestamp));
            setLoading(false);
            return;
        }

        try {
            // Always fetch fresh location data and city name
            console.log("[Weather] 📍 Getting fresh location data...");
            
            // Get city name from coordinates
            const cityNameResult = await WeatherService.getCityFromCoords(latitude, longitude);
            
            // Calculate timezone and local hour
            let localHour = 12;
            try {
                const timezone = tzlookup(latitude, longitude);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
                console.log(`[Weather] ✅ Timezone: ${timezone}, Local hour: ${localHour}`);
            } catch (e) {
                console.warn("[Weather] ⚠️ Could not determine timezone from lat/lon", e);
            }
            
            const bgColor = getBackgroundColor(localHour);
            
            // Fetch weather data (this is what we cache)
            console.log("[Weather] 🌤️ Fetching fresh weather data...");
            const weatherData = await WeatherService.fetchWeatherData(latitude, longitude);
            
            const completeWeatherData: WeatherData = {
                current: weatherData.current,
                forecast: weatherData.forecast,
                cityName: cityNameResult,
                localHour,
                backgroundColor: bgColor,
            };
            
            // Cache the weather data
            weatherCache.set(cacheKey, {
                data: completeWeatherData,
                timestamp: Date.now(),
            });
            
            // Update state
            setWeather(weatherData.current);
            setForecast(weatherData.forecast);
            setCityName(cityNameResult);
            setBackgroundColor(bgColor);
            setLastUpdated(new Date());
            currentLocation.current = { latitude, longitude };
            
            console.log(`[Weather] ✅ Weather loaded: ${weatherData.current?.weather?.[0]?.main} ${weatherData.current?.main?.temp}°F in ${cityNameResult}`);
            
        } catch (err) {
            console.error("[Weather] ❌ Error fetching weather data:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to fetch weather data: ${errorMessage}`);
            
            // If we have cached data, use it as fallback even if expired
            if (cachedData) {
                console.log("[Weather] 🔄 Using expired cached data as fallback");
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
        if (!currentLocation.current) {
            console.log("[Weather] ⚠️ No current location available for refresh");
            return;
        }
        
        console.log("[Weather] 🔄 Refreshing weather data...");
        
        // Clear cache for current location to force fresh fetch
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
                    console.log(`[Weather] 🧹 Cleaning up expired cache entry: ${key}`);
                    weatherCache.delete(key);
                }
            }
        }, 10 * 60 * 1000); // Clean up every 10 minutes

        return () => {
            clearInterval(cleanupInterval);
        };
    }, []);

    return {
        // State
        weather,
        forecast,
        cityName,
        backgroundColor,
        loading,
        error,
        lastUpdated,
        
        // Actions
        fetchWeatherData,
        refreshWeather,
        clearError,
    };
}; 