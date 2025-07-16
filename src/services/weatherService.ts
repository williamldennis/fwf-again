const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export interface WeatherData {
    current: any;
    forecast: any[];
}

export interface FiveDayForecast {
    date: string;
    high: number;
    low: number;
    icon: string;
}

export class WeatherService {
    /**
     * Fetch weather data for a given location using the OpenWeather /forecast API
     */
    static async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
        try {
            console.log("[Weather] 🌤️ Fetching weather data with /forecast API...");

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            // Use /forecast API to get 5-day, 3-hour forecast
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;

            console.log("[Weather] 📡 Making /forecast API request...");
            const response = await fetch(url);
            const data = await response.json();

            if (data.cod && data.cod !== "200" && data.cod !== 200) {
                throw new Error(`Weather API error: ${data.message}`);
            }

            // Get city name from coordinates
            console.log("[Weather] 🏙️ Fetching city name...");
            const cityName = await this.getCityFromCoords(latitude, longitude);
            console.log(`[Weather] ✅ City name: ${cityName}`);

            // Log the full geocoding response for debugging
            try {
                const geoResponse = await fetch(
                    `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=5&appid=${OPENWEATHER_API_KEY}`
                );
                const geoData = await geoResponse.json();
                console.log(
                    "[Weather] 🔍 Full geocoding data:",
                    JSON.stringify(geoData, null, 2)
                );
            } catch (e) {
                console.log("[Weather] ⚠️ Could not log geocoding data:", e);
            }

            // Extract current weather from the first entry
            const firstEntry = data.list && data.list.length > 0 ? data.list[0] : null;
            const currentWeather = firstEntry
                ? {
                      name: cityName,
                      main: {
                          temp: firstEntry.main.temp,
                          feels_like: firstEntry.main.feels_like,
                          humidity: firstEntry.main.humidity,
                          pressure: firstEntry.main.pressure,
                      },
                      weather: [
                          {
                              main: firstEntry.weather[0].main,
                              description: firstEntry.weather[0].description,
                              icon: firstEntry.weather[0].icon,
                          },
                      ],
                      wind: {
                          speed: firstEntry.wind.speed,
                          deg: firstEntry.wind.deg,
                      },
                      dt: firstEntry.dt,
                      dt_txt: firstEntry.dt_txt,
                  }
                : null;

            const forecastList = data.list || [];

            console.log(
                `[Weather] ✅ Weather loaded: ${currentWeather?.weather?.[0]?.main} ${currentWeather?.main?.temp}°F in ${cityName}`
            );
            console.log(
                `[Weather] ✅ Forecast loaded: ${forecastList.length} entries`
            );

            return {
                current: currentWeather,
                forecast: forecastList,
            };
        } catch (error) {
            console.error("[Weather] ❌ Error fetching weather data:", error);
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
     * Update user's weather in the database
     */
    static async updateUserWeatherInDatabase(userId: string, weatherData: any): Promise<void> {
        try {
            const { supabase } = await import("../utils/supabase");
            
            await supabase
                .from("profiles")
                .update({
                    weather_temp: weatherData.current.main.temp,
                    weather_condition: weatherData.current.weather[0].main,
                    weather_icon: weatherData.current.weather[0].icon,
                    weather_updated_at: new Date().toISOString(),
                })
                .eq("id", userId);
                
            console.log("[Weather] ✅ Weather updated in database");
        } catch (error) {
            console.error("[Weather] ❌ Error updating weather in database:", error);
            throw error;
        }
    }
} 