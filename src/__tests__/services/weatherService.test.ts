import { WeatherService } from "../../services/weatherService";

describe("WeatherService", () => {
    describe("aggregateToFiveDay", () => {
        it("should parse old API format dt_txt correctly", () => {
            const forecastData = [
                {
                    dt_txt: "2025-07-16 15:00:00",
                    main: { temp: 75, temp_max: 80, temp_min: 70 },
                    weather: [{ icon: "01d" }],
                },
                {
                    dt_txt: "2025-07-16 18:00:00",
                    main: { temp: 78, temp_max: 82, temp_min: 72 },
                    weather: [{ icon: "02d" }],
                },
            ];

            const result = WeatherService.aggregateToFiveDay(forecastData);
            expect(result).toHaveLength(1);
            expect(result[0].date).toBe("2025-07-16");
            expect(result[0].high).toBe(82);
            expect(result[0].low).toBe(70);
        });

        it("should parse ISO format dt_txt correctly", () => {
            const forecastData = [
                {
                    dt_txt: "2025-07-16T15:00:00.000Z",
                    main: { temp: 75, temp_max: 80, temp_min: 70 },
                    weather: [{ icon: "01d" }],
                },
                {
                    dt_txt: "2025-07-16T18:00:00.000Z",
                    main: { temp: 78, temp_max: 82, temp_min: 72 },
                    weather: [{ icon: "02d" }],
                },
            ];

            const result = WeatherService.aggregateToFiveDay(forecastData);
            expect(result).toHaveLength(1);
            expect(result[0].date).toBe("2025-07-16");
            expect(result[0].high).toBe(82);
            expect(result[0].low).toBe(70);
        });

        it("should parse timestamp format dt correctly", () => {
            const forecastData = [
                {
                    dt: 1752681600, // 2025-07-16 15:00:00 UTC
                    main: { temp: 75, temp_max: 80, temp_min: 70 },
                    weather: [{ icon: "01d" }],
                },
                {
                    dt: 1752692400, // 2025-07-16 18:00:00 UTC
                    main: { temp: 78, temp_max: 82, temp_min: 72 },
                    weather: [{ icon: "02d" }],
                },
            ];

            const result = WeatherService.aggregateToFiveDay(forecastData);
            expect(result).toHaveLength(1);
            expect(result[0].date).toBe("2025-07-16");
            expect(result[0].high).toBe(82);
            expect(result[0].low).toBe(70);
        });

        it("should handle multiple days correctly", () => {
            const forecastData = [
                {
                    dt_txt: "2025-07-16T15:00:00.000Z",
                    main: { temp: 75, temp_max: 80, temp_min: 70 },
                    weather: [{ icon: "01d" }],
                },
                {
                    dt_txt: "2025-07-17T15:00:00.000Z",
                    main: { temp: 78, temp_max: 82, temp_min: 72 },
                    weather: [{ icon: "02d" }],
                },
            ];

            const result = WeatherService.aggregateToFiveDay(forecastData);
            expect(result).toHaveLength(2);
            expect(result[0].date).toBe("2025-07-16");
            expect(result[1].date).toBe("2025-07-17");
        });

        it("should return empty array for invalid data", () => {
            const result = WeatherService.aggregateToFiveDay([]);
            expect(result).toEqual([]);
        });

        it("should skip invalid forecast items", () => {
            const forecastData = [
                {
                    dt_txt: "2025-07-16T15:00:00.000Z",
                    main: { temp: 75 },
                    weather: [{ icon: "01d" }],
                },
                {
                    // Invalid item - missing required fields
                    dt_txt: "2025-07-16T18:00:00.000Z",
                },
            ];

            const result = WeatherService.aggregateToFiveDay(forecastData);
            expect(result).toHaveLength(1);
            expect(result[0].date).toBe("2025-07-16");
        });
    });

    describe("fetchWeatherData", () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });
        afterEach(() => {
            jest.resetAllMocks();
        });
        it("should parse and return weather and forecast structure", async () => {
            (global.fetch as jest.Mock).mockImplementation((url) => {
                if (url.toString().includes("/onecall")) {
                    return Promise.resolve({
                        json: () => Promise.resolve({
                            current: {
                                dt: 1752681600,
                                temp: 75,
                                feels_like: 74,
                                humidity: 50,
                                pressure: 1012,
                                weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
                                wind_speed: 5,
                                wind_deg: 180,
                            },
                            hourly: [
                                {
                                    dt: 1752681600,
                                    temp: 75,
                                    feels_like: 74,
                                    humidity: 50,
                                    pressure: 1012,
                                    weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
                                    wind_speed: 5,
                                    wind_deg: 180,
                                    pop: 0.1,
                                    uvi: 2.5,
                                },
                            ],
                            daily: [
                                {
                                    dt: 1752681600,
                                    temp: { day: 75, min: 70, max: 80, night: 65, eve: 72, morn: 68 },
                                    feels_like: { day: 74, night: 64, eve: 71, morn: 67 },
                                    humidity: 50,
                                    pressure: 1012,
                                    weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
                                    wind_speed: 5,
                                    wind_deg: 180,
                                    pop: 0.1,
                                    uvi: 2.5,
                                },
                            ],
                        }),
                    });
                }
                // Geocoding
                return Promise.resolve({
                    json: () => Promise.resolve([
                        { name: "Test City", district: "Test District" },
                    ]),
                });
            });

            const result = await WeatherService.fetchWeatherData(40, -73);
            expect(result.current).toBeDefined();
            expect(result.current.name).toBe("Test District");
            expect(result.current.main.temp).toBe(75);
            expect(result.forecast).toHaveLength(1);
            // Check that the forecast has the expected structure, but don't test exact timestamp due to timezone conversion
            expect(result.forecast[0].dt_txt).toMatch(/2025-07-16T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            expect(result.hourly).toHaveLength(1);
            expect(result.daily).toHaveLength(1);
        });
    });

    describe("getCityFromCoords", () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });
        afterEach(() => {
            jest.resetAllMocks();
        });
        it("should return the district if available", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: () => Promise.resolve([
                    { name: "Test City", district: "Test District" },
                ]),
            });
            const city = await WeatherService.getCityFromCoords(40, -73);
            expect(city).toBe("Test District");
        });
        it("should return 'Unknown' on error", async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error("fail"));
            const city = await WeatherService.getCityFromCoords(40, -73);
            expect(city).toBe("Unknown");
        });
    });
}); 