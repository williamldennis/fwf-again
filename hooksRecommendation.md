# Hooks Refactor Recommendation

## Problem

- `useAppInitialization` is doing too much (weather, friends, plants, profile)
- `useWeatherData` depends on coordinates from `useAppInitialization`
- UserCard missing weather data due to dependency chain
- Sequential execution instead of parallel

## Revised Solution: Staged Hook Execution

### Analysis of Parallel Execution Issues

After analyzing the code, running hooks in parallel would cause:

- 🚨 **Location permission race conditions** between hooks
- 🚨 **Database write conflicts** when updating user profile
- 🚨 **Duplicate weather API calls** from multiple hooks
- 🚨 **Dependency chain** still exists (weather needs location)

### Current State

```
useAppInitialization (does everything)
├── User auth
├── Profile data (selfie URLs, points, location)
├── Weather fetching
├── Friends fetching
└── Plants fetching
```

### Proposed State: Staged Execution

```
Stage 1: Parallel (Core + Social)
├── useAppInitialization (core app state)
│   ├── User auth
│   └── Available plants
└── useFriendsData (social features)
    ├── Friends fetching
    └── Plants fetching

Stage 2: Sequential (User + Weather)
├── useUserProfile (user-specific data)
│   ├── Profile data (selfie URLs, points, location)
│   └── Location updates
└── useWeatherData (weather service)
    ├── Weather fetching (uses location from useUserProfile)
    └── Weather caching
```

## Implementation Plan

### Step 1: Extract `useUserProfile` Hook

- Move profile fetching logic from `useAppInitialization`
- Return: `{ userProfile, loading, error, refreshProfile }`
- Keep location update logic

### Step 2: Update `useAppInitialization`

- Remove profile fetching
- Remove weather fetching
- Remove friends/plants fetching
- Keep: user auth, available plants, app initialization status

### Step 3: Update `useWeatherData`

- Accept location as parameter: `useWeatherData(latitude, longitude, isInitialized)`
- Remove dependency on `useAppInitialization`

### Step 4: Extract `useFriendsData` Hook

- Move friends and plants logic from `useAppInitialization`
- Return: `{ friendsData, plantedPlants, loading, error, refreshFriends }`

### Step 5: Update `home.tsx` with Staged Execution

```typescript
// Stage 1: Parallel (Core + Social)
const { currentUserId, availablePlants, isInitialized } =
    useAppInitialization();
const { friendsData, plantedPlants } = useFriendsData(
    currentUserId,
    isInitialized
);

// Stage 2: Sequential (User + Weather)
const { userProfile } = useUserProfile(currentUserId, isInitialized);
const { weather, forecast } = useWeatherData(
    userProfile?.latitude,
    userProfile?.longitude,
    isInitialized
);
```

## Benefits

- ✅ Each hook has single responsibility
- ✅ Friends data loads in parallel with core app
- ✅ No race conditions or duplicate API calls
- ✅ UserCard gets weather data directly
- ✅ Minimal code changes
- ✅ No over-engineering
- ✅ Still faster than current sequential approach

## Files to Modify

1. `src/hooks/useUserProfile.ts` (new)
2. `src/hooks/useFriendsData.ts` (new)
3. `src/hooks/useAppInitialization.ts` (simplify)
4. `src/hooks/useWeatherData.ts` (accept location param)
5. `src/app/home.tsx` (update hook usage)

## Testing Strategy

- Test each hook independently
- Test staged execution (parallel + sequential)
- Verify UserCard gets all data
- Ensure no performance regression
- Test error handling in each stage

## Approval Request

Should I proceed with Step 1 (extracting `useUserProfile`) to test this staged approach?
