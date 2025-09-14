const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export interface WeatherData {
    current: any;
    forecast: any[];
    hourly?: HourlyForecast[];
    daily?: DailyForecast[];
}

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

export class WeatherService {
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
            const cityName = await this.getCityFromCoords(latitude, longitude);
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
} 