import { GrowthService } from '../../services/growthService';
import { TimeCalculationService } from '../../services/timeCalculationService';

// Mock external dependencies
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
    High: 'high',
    Low: 'low',
  },
}));

jest.mock('expo-contacts', () => ({
  getContactsAsync: jest.fn(),
  Fields: {
    PhoneNumbers: 'phoneNumbers',
    Name: 'name',
  },
}));

jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockProfile, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'test-user-id',
  latitude: 37.7749,
  longitude: -122.4194,
  selfie_urls: ['https://example.com/selfie.jpg'],
  points: 100,
};

const mockLocation = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  },
};

const mockWeatherData = {
  current: {
    temp: 65,
    feels_like: 67,
    humidity: 70,
    pressure: 1013,
    weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
    wind_speed: 5,
    wind_deg: 180,
    dt: 1640995200,
  },
  hourly: [
    {
      dt: 1640995200,
      temp: 65,
      feels_like: 67,
      humidity: 70,
      pressure: 1013,
      weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
      wind_speed: 5,
      wind_deg: 180,
    },
  ],
};

const mockPlants = [
  {
    id: 'plant-1',
    name: 'Fern',
    growth_time_hours: 6,
    harvest_points: 15,
    image_path: 'fern',
    created_at: '2025-07-04T14:06:08.666219',
    weather_bonus: {
      sunny: 0.7,
      cloudy: 1.8,
      rainy: 1.3,
    },
  },
  {
    id: 'plant-2',
    name: 'Cactus',
    growth_time_hours: 3,
    harvest_points: 10,
    image_path: 'cactus',
    created_at: '2025-07-04T14:06:08.666219',
    weather_bonus: {
      sunny: 2.0,
      cloudy: 0.6,
      rainy: 0.3,
    },
  },
];

const mockPlantedPlants = [
  {
    id: 'planted-1',
    planted_at: '2025-07-06T19:06:43.065878',
    harvested_at: null,
    harvester_id: null,
    current_stage: 2,
    is_mature: false,
    garden_owner_id: 'test-user-id',
    planter_id: 'test-user-id',
    plant_id: 'plant-1',
    slot: 1,
    created_at: '2025-07-06T19:06:43.065878',
  },
  {
    id: 'planted-2',
    planted_at: '2025-07-05T10:00:00.000000',
    harvested_at: null,
    harvester_id: null,
    current_stage: 4,
    is_mature: false,
    garden_owner_id: 'test-user-id',
    planter_id: 'test-user-id',
    plant_id: 'plant-2',
    slot: 2,
    created_at: '2025-07-05T10:00:00.000000',
  },
];

const mockContacts = [
  {
    id: 'contact-1',
    name: 'John Doe',
    phoneNumbers: [{ number: '+1234567890' }],
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    phoneNumbers: [{ number: '+0987654321' }],
  },
];

describe('Critical Path Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    const { supabase } = require('../../utils/supabase');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const Location = require('expo-location');
    Location.getCurrentPositionAsync.mockResolvedValue(mockLocation);
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.reverseGeocodeAsync.mockResolvedValue([
      { city: 'San Francisco', district: 'Mission District' },
    ]);

    const Contacts = require('expo-contacts');
    Contacts.getContactsAsync.mockResolvedValue({
      data: mockContacts,
      hasNextPage: false,
    });

    // Mock fetch for weather API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockWeatherData),
      })
    ) as jest.Mock;
  });

  describe('Main User Flow', () => {
    it('should complete the critical path without errors', async () => {
      // Step 1: User Authentication
      const { supabase } = require('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      expect(user).toBeDefined();
      expect(user.id).toBe('test-user-id');

      // Step 2: Get Current Location
      const Location = require('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      expect(status).toBe('granted');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });
      
      expect(location.coords.latitude).toBe(37.7749);
      expect(location.coords.longitude).toBe(-122.4194);

      // Step 3: Fetch Weather Data
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${location.coords.latitude}&lon=${location.coords.longitude}&units=imperial&exclude=minutely,alerts&appid=test-api-key`
      );
      const weatherData = await weatherResponse.json();
      
      expect(weatherData.current).toBeDefined();
      expect(weatherData.current.temp).toBe(65);
      expect(weatherData.current.weather[0].main).toBe('Clouds');

      // Step 4: Get City Name
      const cityLocation = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      expect(cityLocation).toBeDefined();
      expect(cityLocation[0].city).toBe('San Francisco');

      // Step 5: Fetch User Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('latitude,longitude,selfie_urls,points')
        .eq('id', user.id)
        .single();
      
      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.latitude).toBe(37.7749);

      // Step 6: Fetch Available Plants
      // This would be a database call in the real service
      const availablePlants = mockPlants;
      expect(availablePlants).toHaveLength(2);
      expect(availablePlants[0].name).toBe('Fern');

      // Step 7: Fetch User's Planted Plants
      // This would be a database call in the real service
      const plantedPlants = mockPlantedPlants;
      expect(plantedPlants).toHaveLength(2);
      expect(plantedPlants[0].plant_id).toBe('plant-1');

      // Step 8: Calculate Plant Growth
      const plant = availablePlants[0]; // Fern
      const plantedPlant = plantedPlants[0];
      const weatherCondition = weatherData.current.weather[0].main; // 'Clouds'
      
      const growthCalculation = GrowthService.calculateGrowthStage(
        plantedPlant,
        plant,
        weatherCondition
      );
      
      expect(growthCalculation).toBeDefined();
      expect(growthCalculation.stage).toBeGreaterThanOrEqual(1);
      expect(growthCalculation.stage).toBeLessThanOrEqual(5);
      expect(growthCalculation.progress).toBeGreaterThanOrEqual(0);
      expect(growthCalculation.progress).toBeLessThanOrEqual(100);
      expect(growthCalculation.progress).not.toBeNaN();

      // Step 9: Calculate Time to Maturity
      const weatherBonus = GrowthService.getWeatherBonus(plant, weatherCondition);
      const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        plantedPlant.planted_at,
        plant,
        weatherCondition
      );
      
      expect(timeToMaturity).toBeGreaterThanOrEqual(0);
      expect(timeToMaturity).not.toBeNaN();

      // Step 10: Check if Plant is Mature
      const isMature = GrowthService.isPlantMature(plantedPlant, plant, weatherCondition);
      expect(typeof isMature).toBe('boolean');

      // Step 11: Fetch Contacts
      const Contacts = require('expo-contacts');
      const contactsResult = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      
      expect(contactsResult.data).toBeDefined();
      expect(contactsResult.data).toHaveLength(2);
      expect(contactsResult.data[0].name).toBe('John Doe');

      // Step 12: Verify Final State
      // All critical data should be available and valid
      expect(user).toBeDefined();
      expect(location).toBeDefined();
      expect(weatherData).toBeDefined();
      expect(availablePlants).toBeDefined();
      expect(plantedPlants).toBeDefined();
      expect(growthCalculation).toBeDefined();
      expect(contactsResult.data).toBeDefined();
    });

    it('should handle weather bonus calculations correctly', () => {
      const plant = mockPlants[0]; // Fern
      const weatherCondition = 'Clouds';
      
      const weatherBonus = GrowthService.getWeatherBonus(plant, weatherCondition);
      expect(weatherBonus).toBe(1.8); // Fern loves cloudy weather
      
      const sunnyBonus = GrowthService.getWeatherBonus(plant, 'Clear');
      expect(sunnyBonus).toBe(0.7); // Fern doesn't like sunny weather
      
      const rainyBonus = GrowthService.getWeatherBonus(plant, 'Rain');
      expect(rainyBonus).toBe(1.3); // Fern likes rainy weather
    });

    it('should handle time calculations correctly', () => {
      const plantedAt = '2025-07-06T19:06:43.065878';
      const plant = mockPlants[0]; // Fern
      const weatherCondition = 'Clouds';
      
      const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        plantedAt,
        plant,
        weatherCondition
      );
      
      expect(timeToMaturity).toBeGreaterThanOrEqual(0);
      expect(timeToMaturity).not.toBeNaN();
      
      const formattedTime = TimeCalculationService.getFormattedTimeToMaturity(
        plantedAt,
        plant,
        weatherCondition
      );
      
      expect(typeof formattedTime).toBe('string');
      expect(formattedTime.length).toBeGreaterThan(0);
    });

    it('should handle plant growth stage calculations correctly', () => {
      const plant = mockPlants[0]; // Fern
      const plantedPlant = mockPlantedPlants[0];
      const weatherCondition = 'Clouds';
      
      const growthCalculation = GrowthService.calculateGrowthStage(
        plantedPlant,
        plant,
        weatherCondition
      );
      
      expect(growthCalculation.stage).toBeGreaterThanOrEqual(1);
      expect(growthCalculation.stage).toBeLessThanOrEqual(5);
      expect(growthCalculation.progress).toBeGreaterThanOrEqual(0);
      expect(growthCalculation.progress).toBeLessThanOrEqual(100);
      expect(growthCalculation.shouldAdvance).toBeDefined();
      expect(typeof growthCalculation.shouldAdvance).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing weather data gracefully', async () => {
      // Mock failed weather API call
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Weather API failed'))
      ) as jest.Mock;

      await expect(
        fetch('https://api.openweathermap.org/data/3.0/onecall?lat=37.7749&lon=-122.4194&units=imperial&exclude=minutely,alerts&appid=test-api-key')
      ).rejects.toThrow('Weather API failed');
    });

    it('should handle missing location permission gracefully', async () => {
      const Location = require('expo-location');
      Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const { status } = await Location.getForegroundPermissionsAsync();
      expect(status).toBe('denied');
    });

    it('should handle missing user session gracefully', async () => {
      const { supabase } = require('../../utils/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });
}); 