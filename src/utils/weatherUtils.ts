/**
 * Weather Utilities - Single source of truth for weather condition mapping
 * 
 * This file provides consistent weather condition mapping across the entire app
 * to prevent bugs like the achievement system awarding wrong weather achievements.
 */

export interface WeatherMapping {
  apiCondition: string;      // What the API returns (e.g., "Clouds", "Clear")
  normalizedKey: string;     // Normalized key for internal use (e.g., "cloudy", "sunny")
  displayName: string;       // Human-readable name (e.g., "cloudy", "clear")
  lottieFile: string;        // Lottie animation file name
  selfieKey: string;         // Key for selfie mapping
}

/**
 * Complete weather condition mapping table
 * This is the single source of truth for all weather mappings in the app
 */
export const WEATHER_MAPPINGS: WeatherMapping[] = [
  {
    apiCondition: 'Clear',
    normalizedKey: 'sunny',
    displayName: 'clear',
    lottieFile: 'sunny.json',
    selfieKey: 'sunny'
  },
  {
    apiCondition: 'Clouds',
    normalizedKey: 'cloudy',
    displayName: 'cloudy',
    lottieFile: 'cloudy.json',
    selfieKey: 'cloudy'
  },
  {
    apiCondition: 'Rain',
    normalizedKey: 'rainy',
    displayName: 'rainy',
    lottieFile: 'rainy.json',
    selfieKey: 'rainy'
  },
  {
    apiCondition: 'Drizzle',
    normalizedKey: 'rainy',
    displayName: 'drizzly',
    lottieFile: 'rainy.json',
    selfieKey: 'rainy'
  },
  {
    apiCondition: 'Mist',
    normalizedKey: 'rainy',
    displayName: 'foggy',
    lottieFile: 'rainy.json',
    selfieKey: 'rainy'
  },
  {
    apiCondition: 'Fog',
    normalizedKey: 'rainy',
    displayName: 'foggy',
    lottieFile: 'rainy.json',
    selfieKey: 'rainy'
  },
  {
    apiCondition: 'Haze',
    normalizedKey: 'rainy',
    displayName: 'hazy',
    lottieFile: 'rainy.json',
    selfieKey: 'rainy'
  },
  {
    apiCondition: 'Snow',
    normalizedKey: 'rainy', // Plants don't have snow bonuses, default to rainy
    displayName: 'snowy',
    lottieFile: 'snowy.json',
    selfieKey: 'snowy'
  },
  {
    apiCondition: 'Thunderstorm',
    normalizedKey: 'rainy', // Plants don't have thunderstorm bonuses, default to rainy
    displayName: 'stormy',
    lottieFile: 'thunderstorm.json',
    selfieKey: 'thunderstorm'
  }
];

/**
 * Get weather mapping by API condition
 */
export function getWeatherMapping(apiCondition: string): WeatherMapping {
  const mapping = WEATHER_MAPPINGS.find(
    w => w.apiCondition.toLowerCase() === apiCondition.toLowerCase()
  );
  
  // Default to sunny if not found
  return mapping || WEATHER_MAPPINGS[0];
}

/**
 * Get normalized weather key (for plant bonuses, achievements, etc.)
 */
export function getNormalizedWeatherKey(apiCondition: string): string {
  return getWeatherMapping(apiCondition).normalizedKey;
}

/**
 * Get display name for weather condition
 */
export function getWeatherDisplayName(apiCondition: string): string {
  return getWeatherMapping(apiCondition).displayName;
}

/**
 * Get Lottie animation file name
 */
export function getWeatherLottieFile(apiCondition: string): string {
  return getWeatherMapping(apiCondition).lottieFile;
}

/**
 * Get selfie key for weather condition
 */
export function getWeatherSelfieKey(apiCondition: string): string {
  return getWeatherMapping(apiCondition).selfieKey;
}

/**
 * Check if two weather conditions are equivalent
 * Useful for achievement checking and other comparisons
 * 
 * This function handles both API conditions (e.g., "Clouds") and normalized keys (e.g., "cloudy")
 */
export function areWeatherConditionsEquivalent(condition1: string, condition2: string): boolean {
  // If both conditions are normalized keys, compare them directly
  const normalizedKeys = ['sunny', 'cloudy', 'rainy'];
  const isNormalized1 = normalizedKeys.includes(condition1.toLowerCase());
  const isNormalized2 = normalizedKeys.includes(condition2.toLowerCase());
  
  if (isNormalized1 && isNormalized2) {
    return condition1.toLowerCase() === condition2.toLowerCase();
  }
  
  // If one is normalized and one is API condition, normalize both
  const key1 = isNormalized1 ? condition1.toLowerCase() : getNormalizedWeatherKey(condition1);
  const key2 = isNormalized2 ? condition2.toLowerCase() : getNormalizedWeatherKey(condition2);
  
  return key1 === key2;
}

/**
 * Get all API conditions that map to a specific normalized key
 */
export function getApiConditionsForNormalizedKey(normalizedKey: string): string[] {
  return WEATHER_MAPPINGS
    .filter(w => w.normalizedKey === normalizedKey)
    .map(w => w.apiCondition);
} 