import 'react-native-gesture-handler/jestSetup';

// Mock expo modules
jest.mock('expo-location');
jest.mock('expo-contacts', () => ({
  getContactsAsync: jest.fn(),
  Fields: {
    PhoneNumbers: 'phoneNumbers',
    Name: 'name',
  },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Heavy: 'heavy'
  }
}));
jest.mock('expo-image', () => ({
  Image: 'Image'
}));
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn()
  },
  Stack: {
    Screen: ({ children }) => children
  }
}));

// Mock Supabase
jest.mock('./src/utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn()
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    })),
    removeChannel: jest.fn()
  }
}));

// Mock environment variables
process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY = 'test-api-key';

// Mock fetch
global.fetch = jest.fn();

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock @react-navigation/elements
jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: jest.fn(() => 60)
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({
    width: 375,
    height: 812,
    scale: 3,
    fontScale: 1
  })
}));

// Mock Share
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn()
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn()
}));

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock tz-lookup
jest.mock('tz-lookup', () => jest.fn(() => 'America/New_York'));

// Mock luxon
jest.mock('luxon', () => ({
  DateTime: {
    now: jest.fn(() => ({
      setZone: jest.fn(() => ({
        hour: 12
      }))
    }))
  }
}));

// Mock libphonenumber-js
jest.mock('libphonenumber-js', () => ({
  parsePhoneNumberFromString: jest.fn(() => ({
    isValid: jest.fn(() => true),
    number: '+1234567890'
  }))
}));

// Mock CSS interop and NativeWind
jest.mock('react-native-css-interop', () => ({
  createStyleSheet: jest.fn(() => ({})),
  css: jest.fn(() => ({})),
}));

jest.mock('nativewind', () => ({
  styled: jest.fn((component) => component),
  css: jest.fn(() => ({})),
}));

// Mock GrowthService with more sophisticated behavior
jest.mock('./src/services/growthService', () => {
  const actualGrowthService = jest.requireActual('./src/services/growthService');
  return {
    GrowthService: {
      ...actualGrowthService.GrowthService,
      // Override specific methods that need mocking
      calculateGrowthStage: jest.fn((plantedPlant, plant, weather) => {
        // Use actual implementation for most cases
        return actualGrowthService.GrowthService.calculateGrowthStage(plantedPlant, plant, weather);
      }),
      getWeatherBonus: jest.fn((plant, weather) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.getWeatherBonus(plant, weather);
      }),
      isPlantMature: jest.fn((plantedPlant, plant, weather) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.isPlantMature(plantedPlant, plant, weather);
      }),
      getNextStage: jest.fn((stage) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.getNextStage(stage);
      }),
      getWeatherPreferenceDescription: jest.fn((plant) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.getWeatherPreferenceDescription(plant);
      }),
      getGrowthTimeDescription: jest.fn((growthTime) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.getGrowthTimeDescription(growthTime);
      }),
      validatePlant: jest.fn((plant) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.validatePlant(plant);
      }),
      validatePlantedPlant: jest.fn((plantedPlant) => {
        // Use actual implementation
        return actualGrowthService.GrowthService.validatePlantedPlant(plantedPlant);
      }),
      calculateGardenGrowth: jest.fn(() => [])
    }
  };
}); 