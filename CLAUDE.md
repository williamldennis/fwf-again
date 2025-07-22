# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fair Weather Friends (fwf) is a React Native mobile application built with Expo SDK 53. It's a social gardening game where users connect with friends via phone contacts, view weather conditions, plant virtual plants based on weather, harvest plants for points/XP, and take weather-themed selfies.

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
- **Frontend**: React Native 0.79.4 with React 19
- **Framework**: Expo SDK 53 with file-based routing (Expo Router)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **State Management**: React hooks and Supabase real-time
- **TypeScript**: Strict mode enabled
- **Testing**: Jest with 80% global coverage threshold (90% for services)
- **Error Tracking**: Sentry integration

### Key Directories
- `/app/` - Expo Router file-based routing screens
- `/src/components/` - Reusable React components
- `/src/services/` - Core business logic and Supabase interactions
- `/src/utils/` - Utility functions and helpers
- `/src/contexts/` - React context providers
- `/src/__tests__/` - Test suite with comprehensive mocks

### Core Services
- **WeatherService**: Weather data fetching and processing
- **PlantService**: Plant lifecycle management (planting, growing, harvesting)
- **ContactsService**: Phone contacts integration
- **SelfieService**: Camera and photo filter functionality
- **GardenService**: Garden state and user interactions

### Database Schema
Primary tables include users, user_plants, contacts, harvests, plant_types, user_selfies. Migrations are in `/migrations and database set up/`.

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