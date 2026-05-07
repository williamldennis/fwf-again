# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fair Weather Friends (fwf) is a React Native mobile application built with Expo SDK 55. It's a social gardening game where users connect with friends via phone contacts, view weather conditions, plant virtual plants based on weather, harvest plants for points/XP, and take weather-themed selfies.

## Essential Commands

### Development
```bash
npm start              # Start Expo development server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run web           # Run on web browser
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:services # Run service tests only
npm run test:components # Run component tests only
npm run test:integration # Run integration tests
```

### Code Quality
```bash
npm run lint          # Run ESLint
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Native 0.83.6 with React 19
- **Framework**: Expo SDK 55 with file-based routing (Expo Router)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: PocketBase (SQLite with real-time subscriptions)
- **State Management**: React hooks and PocketBase real-time
- **TypeScript**: Strict mode enabled
- **Testing**: Jest with 80% global coverage threshold (90% for services)

### Key Directories
- `/app/` - Expo Router file-based routing screens
- `/src/components/` - Reusable React components
- `/src/services/` - Core business logic and Supabase interactions
- `/src/utils/` - Utility functions and helpers
- `/src/contexts/` - React context providers
- `/src/__tests__/` - Test suite with comprehensive mocks

### Core Services
- **WeatherService**: Weather data fetching, caching (30-min), and processing via OpenWeather API
- **PlantService**: Plant lifecycle management (planting, growing, harvesting)
- **ContactsService**: Phone contacts integration and friend matching
- **SelfieService**: Camera and photo filter functionality
- **GardenService**: Garden state and user interactions
- **AchievementService**: XP, levels, and achievement tracking
- **ActivityService**: Garden activity logging

### Database (PocketBase)
Collections: users, user_plants, plants, contacts, harvests, user_selfies, weather_data, city_coordinates, xp_transactions, user_achievements, garden_activities.

PocketBase admin: Configure at your EXPO_PUBLIC_POCKETBASE_URL.

### Testing Approach
- Jest with Expo preset
- Comprehensive mocks in `jest.setup.js` for all Expo modules and external dependencies
- Service tests focus on business logic with mocked dependencies
- Integration tests simulate complete user flows

### Important Notes
- Always check existing patterns before adding new code
- Use existing components and utilities rather than creating duplicates
- Follow TypeScript strict mode requirements
- Maintain test coverage above thresholds
- Never commit sensitive information (API keys, tokens)

## iOS Widgets (Future Feature)

Expo SDK 55 includes `expo-widgets` (alpha) for creating iOS home screen and lock screen widgets.

### Installation
```bash
npx expo install expo-widgets
```

### Configuration (app.json)
```json
{
  "plugins": [
    [
      "expo-widgets",
      {
        "bundleIdentifier": "com.willydennis.fwf.widgets",
        "groupIdentifier": "group.com.willydennis.fwf",
        "widgets": [
          {
            "name": "WeatherWidget",
            "displayName": "FWF Weather",
            "description": "Your weather and garden status",
            "supportedFamilies": ["systemSmall", "systemMedium", "accessoryRectangular"]
          }
        ]
      }
    ]
  ]
}
```

### Widget Sizes
- `systemSmall`, `systemMedium`, `systemLarge` - Home screen
- `accessoryCircular`, `accessoryRectangular`, `accessoryInline` - Lock screen

### Data Sharing
Widgets use App Groups to share data with the main app. Weather and plant data should be written to shared storage for widget access.

### Documentation
- [Expo Widgets Docs](https://docs.expo.dev/versions/latest/sdk/widgets/)
- [Expo Blog: iOS Widgets](https://expo.dev/blog/how-to-implement-ios-widgets-in-expo-apps)