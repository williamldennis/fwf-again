# Analytics Integration with PostHog

This project uses PostHog for analytics tracking to understand user behavior and improve the Fair Weather Friends app experience.

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Setup

1. **Get PostHog API Key**: Sign up at [PostHog](https://posthog.com) and get your project API key
2. **Update Environment**: Replace `your_posthog_api_key_here` with your actual API key
3. **Initialize**: PostHog is automatically initialized in the app root (`src/app/_layout.tsx`)

## Analytics Service

The analytics service (`src/services/analyticsService.ts`) provides a centralized interface for tracking:

- **User identification**: `analytics.identify(userId, properties)`
- **Event tracking**: `analytics.track(event, properties)`
- **Screen views**: `analytics.screen(screenName, properties)`
- **User properties**: `analytics.setUserProperties(properties)`

## Current Tracking

### Authentication Events
- `user_signed_in` - When users sign in
- `user_signed_out` - When users sign out

### Game Events
- `plant_planted` - When users plant seeds
  - Properties: plant_type, plant_id, planting_cost, garden_owner, weather_condition
- `plant_harvested` - When users harvest plants
  - Properties: plant_name, plant_id, xp_earned, weather_condition, garden_owner, achievements_unlocked

### Screen Views
- `Home` - Main game screen
  - Properties: has_plants, friends_count, user_level

### User Properties
- `email` - User's email address
- `phone` - User's phone number
- `level` - Current user level
- `points` - Current user points

## Adding New Tracking

To add new analytics events:

1. Import the analytics service:
```typescript
import { analytics } from '../services/analyticsService';
```

2. Track events:
```typescript
analytics.track('event_name', {
  property1: 'value1',
  property2: 'value2',
});
```

3. Track screen views:
```typescript
analytics.screen('ScreenName', {
  context_property: 'value',
});
```

## Privacy & Data

- PostHog is configured with privacy-friendly defaults
- No sensitive information (passwords, tokens) is tracked
- User identification uses Supabase user IDs
- All tracking is optional and can be disabled by not setting the API key

## Testing

Analytics functionality is tested in `src/__tests__/services/analyticsService.test.ts` with comprehensive mocks to ensure proper tracking without making actual API calls during development.