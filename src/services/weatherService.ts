import { pb } from "../utils/pocketbase";
import { z } from "zod";
// @ts-ignore
import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

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

const ZCoordinates = z.object({
    latitude: z.number(),
    longitude: z.number(),
})

export type WeatherData = z.infer<typeof ZWeatherData>;

export type Coordinates = z.infer<typeof ZCoordinates>;

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

export interface CachedCoordsFromCityResponse {
    success: boolean;
    coordinates?: Coordinates | null;
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
            console.log("[Weather] Fetching weather data with OneCall API 3.0...");

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            // Use OneCall API 3.0 to get current, hourly (48h), and daily (7 days) forecast
            const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&units=imperial&exclude=minutely,alerts&appid=${OPENWEATHER_API_KEY}`;

            console.log("[Weather] Making OneCall API 3.0 request...");
            const response = await fetch(url);
            const data = await response.json();

            if (data.cod && data.cod !== 200) {
                throw new Error(`Weather API error: ${data.message}`);
            }

            // Get city name from coordinates
            console.log("[Weather] Fetching city name...");
            let cityName;
            const cachedCityResponse = await this.getCachedCityFromCoords(latitude, longitude);
            if (cachedCityResponse.success && cachedCityResponse.city) {
                cityName = cachedCityResponse.city;
                console.log(`[Weather] Using cached city name: ${cityName}`);
            } else {
                cityName = await this.getCityFromCoords(latitude, longitude);
                console.log(`[Weather] Fetched city name: ${cityName}, saving to DB cache...`);
                await this.saveCityCoords(latitude, longitude, cityName);
            }
            console.log(`[Weather] City name: ${cityName}`);

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
                `[Weather] Weather loaded: ${currentWeather?.weather?.[0]?.main} ${currentWeather?.main?.temp}°F in ${cityName}`
            );
            console.log(
                `[Weather] Forecast loaded: ${forecastList.length} entries, ${hourlyForecast.length} hourly, ${dailyForecast.length} daily`
            );

            return {
                current: currentWeather,
                forecast: forecastList,
                hourly: hourlyForecast,
                daily: dailyForecast,
            };
        } catch (error) {
            console.error("[Weather] Error fetching weather data:", error);
            throw error;
        }
    }

    static async fetchWeatherDataForGraph(latitude: number, longitude: number): Promise<{ hourly: HourlyForGraph[] }> {
        try {
            console.log("[Weather] Fetching weather data for graph with OneCall API 3.0...");

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            // given lat/lon, need to find out current time in local tz
            const timezone = tzlookup(latitude, longitude);
            const localTime = DateTime.now().setZone(timezone);
            const localMidnight = localTime.startOf("day");
            const localMidnightJS = new Date(localMidnight.toMillis());
            const utcTimestamp = Math.floor(localMidnightJS.getTime() / 1000);
            const now = new Date();
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            const hourlyForecasts: HourlyForGraph[] = [];
            console.log(`[Weather] Local timezone: ${timezone}, local midnight: ${localMidnightJS.toISOString()}, UTC timestamp: ${utcTimestamp}, nowTimestamp ${nowTimestamp}`);

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
            console.log(`[Weather] Fetched ${hourlyForecasts.length} hourly data points for graph`);
            return { hourly: hourlyForecasts };

        }
        catch (error) {
            console.error("[Weather] Error fetching weather data for graph:", error);
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
            console.error("[Weather] Error fetching friend forecast:", error);
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
            console.error("[Weather] Error getting city name:", error);
            return "Unknown";
        }
    }

    /**
     * Get coordinates name from city using OpenWeather Geocoding API
     */
    static async getCoordsFromCity(city: string): Promise<Coordinates | null> {
        try {
            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const coords = { latitude: data[0].lat, longitude: data[0].lon };
                return ZCoordinates.parse(coords);
            }

            return null;
        } catch (error) {
            console.error("[Weather] Error getting city name:", error);
            return null;
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

            await pb.collection("users").update(userId, updateData);

            console.log("[Weather] Weather and location updated in database");
        } catch (error) {
            console.error("[Weather] Error updating weather and location in database:", error);
            throw error;
        }
    }

    static async getCachedWeatherData(
        latitude: number, longitude: number, type: WeatherDataType
    ): Promise<CachedWeatherDataResponse> {
        try {
            console.log("[Weather] Getting cached weather data from DB...");
            const key = this.getCacheKey(latitude, longitude);

            if (type === WeatherDataType.Complete) {
                try {
                    const data = await pb.collection('weather_data').getFirstListItem(
                        `coordinates = "${key}" && type = "${type}"`
                    );

                    const freshData = data && (Date.now() - new Date(data.updated).getTime() <= WEATHER_CACHE_DURATION);
                    if (freshData) {
                        console.log("[Weather] Cached weather data fetched from DB is fresh");
                        const completeData = ZCompleteWeatherData.parse(data.data);
                        return {
                            success: true,
                            data: { completeData, timestamp: new Date(data.updated).getTime() },
                        }
                    } else {
                        console.log("[Weather] Cached weather data fetched from DB is stale");
                        return { success: true, data: null };
                    }
                } catch (error: any) {
                    if (error?.status === 404) {
                        console.log("[Weather] No cached weather data found in DB");
                        return { success: true, data: null };
                    }
                    throw error;
                }
            } else {
                // Partial data type
                try {
                    const data = await pb.collection('weather_data').getFirstListItem(
                        `coordinates = "${key}" && type = "${type}"`
                    );

                    const freshData = data && (Date.now() - new Date(data.updated).getTime() <= WEATHER_CACHE_DURATION);
                    if (freshData) {
                        console.log("[Weather] Cached weather data fetched from DB is fresh");
                        const partialData = ZWeatherData.parse(data.data);
                        return {
                            success: true,
                            data: { partialData, timestamp: new Date(data.updated).getTime() },
                        }
                    }
                } catch (error: any) {
                    if (error?.status !== 404) {
                        throw error;
                    }
                }

                // Try complete data as fallback
                console.log("[Weather] Using complete cached data as fallback for partial data");
                try {
                    const data = await pb.collection('weather_data').getFirstListItem(
                        `coordinates = "${key}" && type = "${WeatherDataType.Complete}"`
                    );

                    const freshData = data && (Date.now() - new Date(data.updated).getTime() <= WEATHER_CACHE_DURATION);
                    if (freshData) {
                        console.log("[Weather] Cached weather data fetched from DB is fresh");
                        const completeData = ZCompleteWeatherData.parse(data.data);
                        const partialData = {
                            current: completeData.current,
                            forecast: completeData.forecast,
                            hourly: completeData.hourly,
                            daily: completeData.daily,
                        } as WeatherData;
                        return {
                            success: true,
                            data: { partialData, timestamp: new Date(data.updated).getTime() },
                        }
                    } else {
                        console.log("[Weather] Cached weather data fetched from DB is stale");
                        return { success: true, data: null };
                    }
                } catch (error: any) {
                    if (error?.status === 404) {
                        console.log("[Weather] No cached weather data found in DB");
                        return { success: true, data: null };
                    }
                    throw error;
                }
            }
        }
        catch (error) {
            console.error("[Weather] Error getting cached weather data from DB:", error);
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
            console.log("[Weather] Getting cached weather data fallback from DB...");
            const key = this.getCacheKey(latitude, longitude);

            try {
                const data = await pb.collection('weather_data').getFirstListItem(
                    `coordinates = "${key}" && type = "${type}"`
                );

                console.log("[Weather] Cached weather data fetched from DB");
                if (data) {
                    if (type === WeatherDataType.Complete) {
                        const completeData = ZCompleteWeatherData.parse(data.data);
                        return {
                            success: true,
                            data: { completeData, timestamp: new Date(data.updated).getTime() },
                        }
                    } else {
                        const partialData = ZWeatherData.parse(data.data);
                        return {
                            success: true,
                            data: { partialData, timestamp: new Date(data.updated).getTime() },
                        }
                    }
                } else {
                    return { success: true, data: null };
                }
            } catch (error: any) {
                if (error?.status === 404) {
                    console.log("[Weather] No cached weather data found in DB");
                    return { success: true, data: null };
                }
                throw error;
            }
        }
        catch (error) {
            console.error("[Weather] Error getting cached weather data fallback from DB:", error);
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
            console.log("[Weather] Saving weather data to cache in DB...");
            if (type === WeatherDataType.Complete) {
                ZCompleteWeatherData.parse(weatherData);
            } else {
                ZWeatherData.parse(weatherData);
            }
            const key = this.getCacheKey(latitude, longitude);

            // Try to find existing record
            try {
                const existing = await pb.collection('weather_data').getFirstListItem(
                    `coordinates = "${key}" && type = "${type}"`
                );

                // Update existing record
                await pb.collection('weather_data').update(existing.id, {
                    data: weatherData,
                });
            } catch (error: any) {
                if (error?.status === 404) {
                    // Create new record
                    await pb.collection('weather_data').create({
                        coordinates: key,
                        data: weatherData,
                        type,
                    });
                } else {
                    throw error;
                }
            }

            console.log("[Weather] Weather data saved to cache in DB");
            return { success: true };

        } catch (error) {
            console.error("[Weather] Error saving weather data to cache:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    static async getCachedCityFromCoords(lat: number, lon: number): Promise<CachedCityFromCoordsResponse> {
        try {
            console.log("[Weather] Getting cached city from coords from DB...");
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

            try {
                const data = await pb.collection('city_coordinates').getFirstListItem(
                    `coordinates = "${key}"`
                );

                console.log("[Weather] Cached city fetched from DB");
                return {
                    success: true,
                    city: data ? data.city : null,
                }
            } catch (error: any) {
                if (error?.status === 404) {
                    console.log("[Weather] No cached city coords found in DB");
                    return { success: true, city: null };
                }
                throw error;
            }
        } catch (error) {
            console.error("[Weather] Error getting cached city from coords:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    static async getCachedCoordsFromCity(city: string): Promise<CachedCoordsFromCityResponse> {
        try {
            console.log("[Weather] Getting cached coords from city from DB...");

            const data = await pb.collection('city_coordinates').getFullList({
                filter: `city = "${city}"`,
            });

            if (!data || data.length === 0) {
                console.log("[Weather] No cached coords for city found in DB");
                return { success: true, coordinates: null };
            }
            const parts = data[0].coordinates.split(',');
            if (parts.length !== 2) {
                console.log("[Weather] Invalid coordinates format in DB");
                return { success: true, coordinates: null };
            }

            const coordinates = ZCoordinates.parse({
                latitude: parseFloat(parts[0]),
                longitude: parseFloat(parts[1]),
            })
            console.log("[Weather] Cached coords fetched from DB");
            return {
                success: true,
                coordinates
            }
        } catch (error) {
            console.error("[Weather] Error getting cached coords from city:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    static async saveCityCoords(lat: number, lon: number, cityName: string): Promise<SaveToDBCacheResponse> {
        try {
            console.log("[Weather] Saving city and coords to cache in DB...");
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

            // Try to find existing record
            try {
                const existing = await pb.collection('city_coordinates').getFirstListItem(
                    `coordinates = "${key}"`
                );

                // Update existing record
                await pb.collection('city_coordinates').update(existing.id, {
                    city: cityName,
                });
            } catch (error: any) {
                if (error?.status === 404) {
                    // Create new record
                    await pb.collection('city_coordinates').create({
                        coordinates: key,
                        city: cityName,
                    });
                } else {
                    throw error;
                }
            }

            console.log("[Weather] City and coords saved to cache in DB");
            return { success: true };

        } catch (error) {
            console.error("[Weather] Error saving city and coords to cache:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
