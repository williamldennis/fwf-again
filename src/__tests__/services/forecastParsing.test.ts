// Test forecast parsing functionality
describe("Forecast Parsing", () => {
    // Mock the aggregateToFiveDay function from home.tsx
    function aggregateToFiveDay(forecastList: any[]): any[] {
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

        const result = aggregateToFiveDay(forecastData);
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

        const result = aggregateToFiveDay(forecastData);
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

        const result = aggregateToFiveDay(forecastData);
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

        const result = aggregateToFiveDay(forecastData);
        expect(result).toHaveLength(2);
        expect(result[0].date).toBe("2025-07-16");
        expect(result[1].date).toBe("2025-07-17");
    });

    it("should return empty array for invalid data", () => {
        const result = aggregateToFiveDay([]);
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

        const result = aggregateToFiveDay(forecastData);
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe("2025-07-16");
    });
}); 