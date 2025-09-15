import { supabase } from "../utils/supabase";
import { z } from "zod";

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const WEATHER_CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

const ZWeatherCondition = z.object({
    main: z.string(),
    description: z.string(),
    icon: z.string(),
});

const ZHourlyForecast = z.object({
    dt: z.number(),
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
    pressure: z.number(),
    weather: z.array(ZWeatherCondition),
    wind_speed: z.number(),
    wind_deg: z.number(),
    pop: z.number(), // precipitation probability (0-1)
    uvi: z.number(), // UV index
    visibility: z.number().optional(),
    clouds: z.number().optional(),
});

const ZHourlyForGraph = z.object({
    dt: z.number(),
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
    pressure: z.number(),
    weather: z.array(ZWeatherCondition),
    wind_speed: z.number(),
    wind_deg: z.number(),
    pop: z.number().optional(),
    uvi: z.number(), // UV index
    visibility: z.number().optional(),
    clouds: z.number().optional(),
});

const ZDailyForecast = z.object({
    dt: z.number(),
    temp: z.object({
        day: z.number(),
        min: z.number(),
        max: z.number(),
        night: z.number(),
        eve: z.number(),
        morn: z.number(),
    }),
    feels_like: z.object({
        day: z.number(),
        night: z.number(),
        eve: z.number(),
        morn: z.number(),
    }),
    humidity: z.number(),
    pressure: z.number(),
    weather: z.array(ZWeatherCondition),
    wind_speed: z.number(),
    wind_deg: z.number(),
    pop: z.number(),
    uvi: z.number(),
    clouds: z.number().optional(),
});

const ZWeatherData = z.object({
    current: z.any(),
    forecast: z.array(z.any()),
    hourly: z.array(ZHourlyForecast).optional(),
    daily: z.array(ZDailyForecast).optional(),
})

const ZCompleteWeatherData = ZWeatherData.extend({
    hourlyForGraph: z.array(ZHourlyForGraph).optional(),
    cityName: z.string(),
    localHour: z.number(),
    backgroundColor: z.string(),
})

export type WeatherData = z.infer<typeof ZWeatherData>;

export interface FiveDayForecast {
    date: string;
    high: number;
    low: number;
    icon: string;
}

// New interfaces for OneCall API 3.0
export interface HourlyForecast {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    weather: WeatherCondition[];
    wind_speed: number;
    wind_deg: number;
    pop: number; // precipitation probability (0-1)
    uvi: number; // UV index
    visibility?: number;
    clouds?: number;
}

export interface HourlyForGraph {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    weather: WeatherCondition[];
    wind_speed: number;
    wind_deg: number;
    pop?: number;
    uvi: number; // UV index
    visibility?: number;
    clouds?: number;
}

export interface DailyForecast {
    dt: number;
    temp: {
        day: number;
        min: number;
        max: number;
        night: number;
        eve: number;
        morn: number;
    };
    feels_like: {
        day: number;
        night: number;
        eve: number;
        morn: number;
    };
    humidity: number;
    pressure: number;
    weather: WeatherCondition[];
    wind_speed: number;
    wind_deg: number;
    pop: number; // precipitation probability (0-1)
    uvi: number; // UV index
    clouds?: number;
}

export interface WeatherCondition {
    main: string;
    description: string;
    icon: string;
}

export type CompleteWeatherData = z.infer<typeof ZCompleteWeatherData>;

export interface CachedWeatherDataResponse {
    success: boolean;
    data?: { completeData?: CompleteWeatherData, partialData?: WeatherData; timestamp: number } | null;
    error?: string;
}

export interface CachedCityFromCoordsResponse {
    success: boolean;
    city?: string | null;
    error?: string;
}

export interface SaveToDBCacheResponse {
    success: boolean;
    error?: string;
}

export enum WeatherDataType {
    Partial = 'partial',
    Complete = 'complete',
}

export class WeatherService {
    static getCacheKey(latitude: number, longitude: number): string {
        return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    }
    /**
     * Fetch weather data for a given location using the OpenWeather OneCall API 3.0
     */
    static async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
        try {
            console.log("[Weather] 🌤️ Fetching weather data with OneCall API 3.0...");

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            // Use OneCall API 3.0 to get current, hourly (48h), and daily (7 days) forecast
            const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&units=imperial&exclude=minutely,alerts&appid=${OPENWEATHER_API_KEY}`;

            console.log("[Weather] 📡 Making OneCall API 3.0 request...");
            const response = await fetch(url);
            const data = await response.json();

            if (data.cod && data.cod !== 200) {
                throw new Error(`Weather API error: ${data.message}`);
            }

            // Get city name from coordinates
            console.log("[Weather] 🏙️ Fetching city name...");
            let cityName;
            const cachedCityResponse = await this.getCachedCityFromCoords(latitude, longitude);
            if (cachedCityResponse.success && cachedCityResponse.city) {
                cityName = cachedCityResponse.city;
                console.log(`[Weather] ✅ Using cached city name: ${cityName}`);
            } else {
                cityName = await this.getCityFromCoords(latitude, longitude);
                console.log(`[Weather] ✅ Fetched city name: ${cityName}, saving to DB cache...`);
                await this.saveCityCoords(latitude, longitude, cityName);
            }
            console.log(`[Weather] ✅ City name: ${cityName}`);

            // Extract current weather
            const currentWeather = data.current ? {
                name: cityName,
                main: {
                    temp: data.current.temp,
                    feels_like: data.current.feels_like,
                    humidity: data.current.humidity,
                    pressure: data.current.pressure,
                },
                weather: [
                    {
                        main: data.current.weather[0].main,
                        description: data.current.weather[0].description,
                        icon: data.current.weather[0].icon,
                    },
                ],
                wind: {
                    speed: data.current.wind_speed,
                    deg: data.current.wind_deg,
                },
                dt: data.current.dt,
                dt_txt: new Date(data.current.dt * 1000).toISOString(),
            } : null;

            // Convert hourly forecast to 3-hourly format (matching the old API structure for backward compatibility)
            const forecastList = data.hourly?.slice(0, 40).map((hour: any) => ({
                dt: hour.dt,
                dt_txt: new Date(hour.dt * 1000).toISOString(),
                main: {
                    temp: hour.temp,
                    feels_like: hour.feels_like,
                    humidity: hour.humidity,
                    pressure: hour.pressure,
                    temp_min: hour.temp,
                    temp_max: hour.temp,
                },
                weather: [
                    {
                        main: hour.weather[0].main,
                        description: hour.weather[0].description,
                        icon: hour.weather[0].icon,
                    },
                ],
                wind: {
                    speed: hour.wind_speed,
                    deg: hour.wind_deg,
                },
            })) || [];

            // Extract hourly and daily forecasts for enhanced features
            const hourlyForecast: HourlyForecast[] = data.hourly?.slice(0, 24).map((hour: any) => ({
                dt: hour.dt,
                temp: hour.temp,
                feels_like: hour.feels_like,
                humidity: hour.humidity,
                pressure: hour.pressure,
                weather: hour.weather,
                wind_speed: hour.wind_speed,
                wind_deg: hour.wind_deg,
                pop: hour.pop,
                uvi: hour.uvi,
                visibility: hour.visibility,
                clouds: hour.clouds,
            })) || [];

            const dailyForecast: DailyForecast[] = data.daily?.slice(0, 7).map((day: any) => ({
                dt: day.dt,
                temp: day.temp,
                feels_like: day.feels_like,
                humidity: day.humidity,
                pressure: day.pressure,
                weather: day.weather,
                wind_speed: day.wind_speed,
                wind_deg: day.wind_deg,
                pop: day.pop,
                uvi: day.uvi,
                clouds: day.clouds,
            })) || [];

            console.log(
                `[Weather] ✅ Weather loaded: ${currentWeather?.weather?.[0]?.main} ${currentWeather?.main?.temp}°F in ${cityName}`
            );
            console.log(
                `[Weather] ✅ Forecast loaded: ${forecastList.length} entries, ${hourlyForecast.length} hourly, ${dailyForecast.length} daily`
            );

            return {
                current: currentWeather,
                forecast: forecastList,
                hourly: hourlyForecast,
                daily: dailyForecast,
            };
        } catch (error) {
            console.error("[Weather] ❌ Error fetching weather data:", error);
            throw error;
        }
    }

    static async fetchWeatherDataForGraph(latitude: number, longitude: number): Promise<{ hourly: HourlyForGraph[] }> {
        try {
            console.log("[Weather] 🌤️ Fetching weather data for graph with OneCall API 3.0...");

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            const now = new Date();
            const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const utcTimestamp = Math.floor(localMidnight.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            const hourlyForecasts: HourlyForGraph[] = [];

            for (let i = 0; i <= 24; i++) {
                const time = utcTimestamp + i * 3600;
                let data;
                if (time < nowTimestamp) {
                    const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${latitude}&lon=${longitude}&units=imperial&dt=${time}&appid=${OPENWEATHER_API_KEY}`
                    const response = await fetch(url);
                    data = await response.json();
                    if (data.cod && data.cod !== 200) {
                        throw new Error(`Weather API error: ${data.message}`);
                    }
                    if (data.data?.length > 0) {
                        const hour = data.data[0];
                        const hourlyForecast: HourlyForGraph = {
                            dt: hour.dt,
                            temp: hour.temp,
                            feels_like: hour.feels_like,
                            humidity: hour.humidity,
                            pressure: hour.pressure,
                            weather: hour.weather,
                            wind_speed: hour.wind_speed,
                            wind_deg: hour.wind_deg,
                            uvi: hour.uvi,
                            visibility: hour.visibility,
                            clouds: hour.clouds,
                        };
                        hourlyForecasts.push(hourlyForecast);
                    }
                } else {
                    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&units=imperial&exclude=minutely,daily,alerts&appid=${OPENWEATHER_API_KEY}`;
                    const response = await fetch(url);
                    data = await response.json();
                    if (data.cod && data.cod !== 200) {
                        throw new Error(`Weather API error: ${data.message}`);
                    }
                    const { dt } = hourlyForecasts.length > 0 ? hourlyForecasts[hourlyForecasts.length - 1] : { dt: null };
                    const firstDt = data.hourly && data.hourly.length > 0 ? data.hourly[0].dt : null;
                    const start = dt && firstDt && dt === firstDt ? 1 : 0;
                    const remaining = 25 - hourlyForecasts.length;
                    data.hourly?.slice(start, start + remaining).forEach((hour: any) => {
                        hourlyForecasts.push
                            ({
                                dt: hour.dt,
                                temp: hour.temp,
                                feels_like: hour.feels_like,
                                humidity: hour.humidity,
                                pressure: hour.pressure,
                                weather: hour.weather,
                                wind_speed: hour.wind_speed,
                                wind_deg: hour.wind_deg,
                                pop: hour.pop,
                                uvi: hour.uvi,
                                visibility: hour.visibility,
                                clouds: hour.clouds,
                            })
                    });
                    break;
                }
            }
            console.log(`[Weather] ✅ Fetched ${hourlyForecasts.length} hourly data points for graph`);
            return { hourly: hourlyForecasts };

        }
        catch (error) {
            console.error("[Weather] ❌ Error fetching weather data for graph:", error);
            throw error;
        }
    }

    /**
     * Fetch forecast data for a friend's location
     */
    static async fetchFriendForecast(latitude: number, longitude: number): Promise<FiveDayForecast[]> {
        try {
            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.list) {
                return this.aggregateToFiveDay(data.list);
            }

            return [];
        } catch (error) {
            console.error("[Weather] ❌ Error fetching friend forecast:", error);
            return [];
        }
    }

    /**
     * Get city name from coordinates using OpenWeather Geocoding API
     */
    static async getCityFromCoords(lat: number, lon: number): Promise<string> {
        try {
            if (!OPENWEATHER_API_KEY) {
                return "Unknown";
            }

            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                // Prefer district (neighborhood) over city if available
                return data[0].district || data[0].name || "Unknown";
            }

            return "Unknown";
        } catch (error) {
            console.error("[Weather] ❌ Error getting city name:", error);
            return "Unknown";
        }
    }

    /**
     * Aggregate forecast data into 5-day format
     */
    static aggregateToFiveDay(forecastList: any[]): FiveDayForecast[] {
        if (!forecastList || forecastList.length === 0) return [];

        const days: {
            [date: string]: {
                date: string;
                high: number;
                low: number;
                icon: string;
            };
        } = {};

        forecastList.forEach((item: any) => {
            // Validate item structure
            if (!item || !item.main || !item.weather || !item.weather[0]) {
                return;
            }

            // Handle both old API format (dt_txt) and new OneCall API format (dt)
            let date: string;
            let hour: number;

            try {
                if (item.dt_txt && typeof item.dt_txt === "string") {
                    // Handle both old API format (space-separated) and ISO format
                    if (item.dt_txt.includes(" ")) {
                        // Old API format: "2025-07-16 15:00:00"
                        const parts = item.dt_txt.split(" ");
                        if (parts.length >= 2) {
                            date = parts[0];
                            hour = parseInt(parts[1].split(":")[0], 10);
                        } else {
                            return;
                        }
                    } else {
                        // ISO format: "2025-07-16T15:00:00.000Z"
                        const dateObj = new Date(item.dt_txt);
                        if (isNaN(dateObj.getTime())) {
                            return;
                        }
                        date = dateObj.toISOString().split("T")[0];
                        hour = dateObj.getHours();
                    }
                } else if (item.dt && typeof item.dt === "number") {
                    // New OneCall API format
                    const dateObj = new Date(item.dt * 1000);
                    date = dateObj.toISOString().split("T")[0];
                    hour = dateObj.getHours();
                } else {
                    return;
                }

                if (!days[date]) {
                    days[date] = {
                        date,
                        high: item.main.temp_max || item.main.temp || 0,
                        low: item.main.temp_min || item.main.temp || 0,
                        icon: item.weather[0].icon || "01d",
                    };
                } else {
                    days[date].high = Math.max(
                        days[date].high,
                        item.main.temp_max || item.main.temp || 0
                    );
                    days[date].low = Math.min(
                        days[date].low,
                        item.main.temp_min || item.main.temp || 0
                    );
                }
                // Use the icon from the midday forecast if possible
                if (hour === 12) {
                    days[date].icon = item.weather[0].icon || "01d";
                }
            } catch (error) {
                return;
            }
        });

        // Return only the first 5 days
        return Object.values(days).slice(0, 5);
    }

    /**
     * Update user's weather and location in the database
     */
    static async updateUserWeatherInDatabase(
        userId: string,
        weatherData: any,
        location?: { latitude: number; longitude: number }
    ): Promise<void> {
        try {
            const { supabase } = require("../utils/supabase");

            const updateData: any = {
                weather_temp: weatherData.current.main.temp,
                weather_condition: weatherData.current.weather[0].main,
                weather_icon: weatherData.current.weather[0].icon,
                weather_updated_at: new Date().toISOString(),
            };

            // Add location coordinates if provided
            if (location) {
                updateData.latitude = location.latitude;
                updateData.longitude = location.longitude;
            }

            await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", userId);

            console.log("[Weather] ✅ Weather and location updated in database");
        } catch (error) {
            console.error("[Weather] ❌ Error updating weather and location in database:", error);
            throw error;
        }
    }

    static async getCachedWeatherData(
        latitude: number, longitude: number, type: WeatherDataType
    ): Promise<CachedWeatherDataResponse> {
        try {
            console.log("[Weather] 🌤️ Getting cached weather data from DB...");
            const key = this.getCacheKey(latitude, longitude);
            if (type === WeatherDataType.Complete) {
                const { data, error } = await supabase
                    .from('weather_data')
                    .select('data, updated_at')
                    .eq('coordinates', key)
                    .eq('type', type)
                    .single();
                if (error) {
                    if (error.code === 'PGRST116') {
                        console.log("[Weather] No cached weather data found in DB");
                        return { success: true, data: null };
                    }
                    throw error;
                }
                const freshData = data && (Date.now() - new Date(data.updated_at).getTime() <= WEATHER_CACHE_DURATION);
                if (freshData) {
                    console.log("[Weather] ✅ Cached weather data fetched from DB is fresh");
                    const completeData = ZCompleteWeatherData.parse(data.data);
                    return {
                        success: true,
                        data: { completeData, timestamp: new Date(data.updated_at).getTime() },
                    }
                } else {
                    console.log("[Weather] Cached weather data fetched from DB is stale");
                    return { success: true, data: null };
                }
            } else {
                const { data, error } = await supabase
                    .from('weather_data')
                    .select('data, updated_at')
                    .eq('coordinates', key)
                    .eq('type', type)
                    .single();
                if (error && error.code !== "PGRST116") {
                    throw error;
                }
                const freshData = data && (Date.now() - new Date(data.updated_at).getTime() <= WEATHER_CACHE_DURATION);
                if (freshData) {
                    console.log("[Weather] ✅ Cached weather data fetched from DB is fresh");
                    const partialData = ZWeatherData.parse(data.data);
                    return {
                        success: true,
                        data: { partialData, timestamp: new Date(data.updated_at).getTime() },
                    }
                } else {
                    console.log("[Weather] Using complete cached data as fallback for partial data");
                    const { data, error } = await supabase
                        .from('weather_data')
                        .select('data, updated_at')
                        .eq('coordinates', key)
                        .eq('type', WeatherDataType.Complete)
                        .single();
                    if (error) {
                        if (error.code === 'PGRST116') {
                            console.log("[Weather] No cached weather data found in DB");
                            return { success: true, data: null };
                        }
                        throw error;
                    }
                    const freshData = data && (Date.now() - new Date(data.updated_at).getTime() <= WEATHER_CACHE_DURATION);
                    if (freshData) {
                        console.log("[Weather] ✅ Cached weather data fetched from DB is fresh");
                        const completeData = ZCompleteWeatherData.parse(data.data);
                        const partialData = {
                            current: completeData.current,
                            forecast: completeData.forecast,
                            hourly: completeData.hourly,
                            daily: completeData.daily,
                        } as WeatherData;
                        return {
                            success: true,
                            data: { partialData, timestamp: new Date(data.updated_at).getTime() },
                        }
                    } else {
                        console.log("[Weather] Cached weather data fetched from DB is stale");
                        return { success: true, data: null };
                    }
                }
            }
        }
        catch (error) {
            console.error("[Weather] ❌ Error getting cached weather data from DB:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    static async getCachedWeatherDataFallback(
        latitude: number, longitude: number, type: WeatherDataType
    ): Promise<CachedWeatherDataResponse> {
        try {
            console.log("[Weather] 🌤️ Getting cached weather data fallback from DB...");
            const key = this.getCacheKey(latitude, longitude);
            const { data, error } = await supabase
                .from('weather_data')
                .select('data, updated_at')
                .eq('coordinates', key)
                .eq('type', type)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log("[Weather] No cached weather data found in DB");
                    return { success: true, data: null };
                }
                throw error;
            }
            console.log("[Weather] ✅ Cached weather data fetched from DB");
            if (data) {
                if (type === WeatherDataType.Complete) {
                    const completeData = ZCompleteWeatherData.parse(data.data);
                    return {
                        success: true,
                        data: { completeData, timestamp: new Date(data.updated_at).getTime() },
                    }
                } else {
                    const partialData = ZWeatherData.parse(data.data);
                    return {
                        success: true,
                        data: { partialData, timestamp: new Date(data.updated_at).getTime() },
                    }
                }
            } else {
                return { success: true, data: null };
            }

        }
        catch (error) {
            console.error("[Weather] ❌ Error getting cached weather data fallback from DB:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }


    static async saveWeatherData(
        latitude: number, longitude: number, weatherData: CompleteWeatherData | WeatherData, type: WeatherDataType
    ): Promise<SaveToDBCacheResponse> {
        try {
            console.log("[Weather] 💾 Saving weather data to cache in DB...");
            if (type === WeatherDataType.Complete) {
                ZCompleteWeatherData.parse(weatherData);
            } else {
                ZWeatherData.parse(weatherData);
            }
            const key = this.getCacheKey(latitude, longitude);
            const { error } = await supabase
                .from('weather_data')
                .upsert({
                    coordinates: key,
                    data: weatherData,
                    updated_at: new Date().toISOString(),
                    type,
                }, { onConflict: 'coordinates,type' });
            if (error) {
                throw error;
            }
            console.log("[Weather] ✅ Weather data saved to cache in DB");
            return { success: true };

        } catch (error) {
            console.error("[Weather] ❌ Error saving weather data to cache:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    static async getCachedCityFromCoords(lat: number, lon: number): Promise<CachedCityFromCoordsResponse> {
        try {
            console.log("[Weather] 🌤️ Getting cached city from coords from DB...");
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
            const { data, error } = await supabase
                .from('city_coordinates')
                .select('city')
                .eq('coordinates', key)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log("[Weather] No cached city coords found in DB");
                    return { success: true, city: null };
                }
                throw error;
            }
            console.log("[Weather] ✅ Cached city fetched from DB");
            return {
                success: true,
                city: data ? data.city : null,
            }
        } catch (error) {
            console.error("[Weather] ❌ Error getting cached city from coords:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    static async saveCityCoords(lat: number, lon: number, cityName: string): Promise<SaveToDBCacheResponse> {
        try {
            console.log("[Weather] 💾 Saving city and coords to cache in DB...");
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
            const { error } = await supabase
                .from('city_coordinates')
                .upsert({
                    coordinates: key,
                    city: cityName,
                }, { onConflict: 'coordinates' });
            if (error) {
                throw error;
            }
            console.log("[Weather] ✅ City and coords saved to cache in DB");
            return { success: true };

        } catch (error) {
            console.error("[Weather] ❌ Error saving city and coords to cache:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
} 