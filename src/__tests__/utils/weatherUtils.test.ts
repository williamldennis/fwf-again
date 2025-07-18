import { 
  getNormalizedWeatherKey, 
  getWeatherDisplayName, 
  getWeatherLottieFile, 
  getWeatherSelfieKey,
  areWeatherConditionsEquivalent 
} from '../../utils/weatherUtils';

describe('Weather Utils', () => {
  describe('getNormalizedWeatherKey', () => {
    it('should map API conditions to normalized keys correctly', () => {
      expect(getNormalizedWeatherKey('Clear')).toBe('sunny');
      expect(getNormalizedWeatherKey('Clouds')).toBe('cloudy');
      expect(getNormalizedWeatherKey('Rain')).toBe('rainy');
      expect(getNormalizedWeatherKey('Drizzle')).toBe('rainy');
      expect(getNormalizedWeatherKey('Mist')).toBe('rainy');
      expect(getNormalizedWeatherKey('Fog')).toBe('rainy');
      expect(getNormalizedWeatherKey('Haze')).toBe('rainy');
      expect(getNormalizedWeatherKey('Snow')).toBe('rainy');
      expect(getNormalizedWeatherKey('Thunderstorm')).toBe('rainy');
    });

    it('should handle case insensitive input', () => {
      expect(getNormalizedWeatherKey('clear')).toBe('sunny');
      expect(getNormalizedWeatherKey('CLOUDS')).toBe('cloudy');
      expect(getNormalizedWeatherKey('rain')).toBe('rainy');
    });

    it('should default to sunny for unknown conditions', () => {
      expect(getNormalizedWeatherKey('Unknown')).toBe('sunny');
    });
  });

  describe('getWeatherDisplayName', () => {
    it('should return correct display names', () => {
      expect(getWeatherDisplayName('Clear')).toBe('clear');
      expect(getWeatherDisplayName('Clouds')).toBe('cloudy');
      expect(getWeatherDisplayName('Rain')).toBe('rainy');
      expect(getWeatherDisplayName('Drizzle')).toBe('drizzly');
      expect(getWeatherDisplayName('Mist')).toBe('foggy');
      expect(getWeatherDisplayName('Fog')).toBe('foggy');
      expect(getWeatherDisplayName('Haze')).toBe('hazy');
      expect(getWeatherDisplayName('Snow')).toBe('snowy');
      expect(getWeatherDisplayName('Thunderstorm')).toBe('stormy');
    });
  });

  describe('getWeatherLottieFile', () => {
    it('should return correct Lottie file names', () => {
      expect(getWeatherLottieFile('Clear')).toBe('sunny.json');
      expect(getWeatherLottieFile('Clouds')).toBe('cloudy.json');
      expect(getWeatherLottieFile('Rain')).toBe('rainy.json');
      expect(getWeatherLottieFile('Snow')).toBe('snowy.json');
      expect(getWeatherLottieFile('Thunderstorm')).toBe('thunderstorm.json');
    });
  });

  describe('getWeatherSelfieKey', () => {
    it('should return correct selfie keys', () => {
      expect(getWeatherSelfieKey('Clear')).toBe('sunny');
      expect(getWeatherSelfieKey('Clouds')).toBe('cloudy');
      expect(getWeatherSelfieKey('Rain')).toBe('rainy');
      expect(getWeatherSelfieKey('Snow')).toBe('snowy');
      expect(getWeatherSelfieKey('Thunderstorm')).toBe('thunderstorm');
    });
  });

  describe('areWeatherConditionsEquivalent', () => {
    it('should correctly identify equivalent weather conditions', () => {
      // Same condition
      expect(areWeatherConditionsEquivalent('Clear', 'Clear')).toBe(true);
      expect(areWeatherConditionsEquivalent('Clouds', 'Clouds')).toBe(true);
      
      // Different API conditions that map to same normalized key
      expect(areWeatherConditionsEquivalent('Clear', 'sunny')).toBe(true);
      expect(areWeatherConditionsEquivalent('Clouds', 'cloudy')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'rainy')).toBe(true);
      
      // Multiple conditions that map to rainy
      expect(areWeatherConditionsEquivalent('Rain', 'Drizzle')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'Mist')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'Fog')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'Haze')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'Snow')).toBe(true);
      expect(areWeatherConditionsEquivalent('Rain', 'Thunderstorm')).toBe(true);
    });

    it('should correctly identify non-equivalent weather conditions', () => {
      expect(areWeatherConditionsEquivalent('Clear', 'Clouds')).toBe(false);
      expect(areWeatherConditionsEquivalent('Clear', 'Rain')).toBe(false);
      expect(areWeatherConditionsEquivalent('Clouds', 'Rain')).toBe(false);
    });

    it('should handle case insensitive comparison', () => {
      expect(areWeatherConditionsEquivalent('clear', 'CLOUDS')).toBe(false);
      expect(areWeatherConditionsEquivalent('CLEAR', 'sunny')).toBe(true);
    });
  });

  describe('Achievement System Integration', () => {
    it('should correctly match weather conditions for achievements', () => {
      // Test the exact scenario from the bug:
      // User plants in "Clouds" weather, achievement condition is "cloudy"
      expect(areWeatherConditionsEquivalent('Clouds', 'cloudy')).toBe(true);
      
      // User plants in "Clear" weather, achievement condition is "sunny"
      expect(areWeatherConditionsEquivalent('Clear', 'sunny')).toBe(true);
      
      // User plants in "Rain" weather, achievement condition is "rainy"
      expect(areWeatherConditionsEquivalent('Rain', 'rainy')).toBe(true);
      
      // These should NOT match
      expect(areWeatherConditionsEquivalent('Clouds', 'sunny')).toBe(false);
      expect(areWeatherConditionsEquivalent('Clear', 'cloudy')).toBe(false);
      expect(areWeatherConditionsEquivalent('Rain', 'sunny')).toBe(false);
    });
  });
}); 