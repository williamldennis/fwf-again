# Hooks Refactor Recommendation

## Problem

- `useAppInitialization` is doing too much (weather, friends, plants, profile)
- `useWeatherData` depends on coordinates from `useAppInitialization`
- UserCard missing weather data due to dependency chain
- Sequential execution instead of parallel

## Deep Analysis: What Needs to Be Loaded When

### Critical Dependencies

1. **User Auth → Profile Data** (Sequential - Required)
    - Profile data requires authenticated user ID
    - Location updates require authenticated user ID

2. **Profile Data → Weather Data** (Sequential - Required)
    - Weather needs user's location coordinates
    - Weather API calls are expensive, need correct location

3. **User Auth → Friends Data** (Parallel - Independent)
    - Friends data only needs user ID
    - No dependency on profile or weather

4. **Available Plants** (Lazy Load - On Demand)
    - Only needed when user opens PlantPicker
    - Not needed for initial app render
    - Can be loaded when user first tries to plant

5. **Friends Data → Planted Plants** (Sequential - Required)
    - Planted plants need friend IDs from friends data
    - Batch fetching requires all user IDs upfront

### Performance Considerations

- **Heavy Operations**: Weather API, Friends discovery, Plant growth updates
- **Light Operations**: User auth, Profile fetch
- **User Experience**: Profile needed for initial render, available plants can be lazy loaded

## Revised Solution: Optimized Staged Execution

### Current State

```
useAppInitialization (does everything)
├── User auth
├── Profile data (selfie URLs, points, location)
├── Weather fetching
├── Friends fetching
└── Plants fetching
```

### Proposed State: Optimized Staged Execution

```
Stage 1: Core App Setup (Sequential)
├── useAppInitialization (core app state)
│   ├── User auth
│   └── Profile data (selfie URLs, points, location)

Stage 2: Parallel Data Loading
├── useWeatherData (weather service)
│   ├── Weather fetching (uses location from Stage 1)
│   └── Weather caching
└── useFriendsData (social features)
    ├── Friends fetching
    └── Plants fetching (uses friend IDs)
```

## Implementation Plan

### Step 1: Simplify `useAppInitialization`

- Keep: User auth, Profile data
- Remove: Weather fetching, Friends fetching, Plants fetching, Available plants
- Return: `{ currentUserId, userProfile, isInitialized, loading, error }`

### Step 2: Update `useWeatherData`

- Accept location as parameter: `useWeatherData(latitude, longitude, isInitialized)`
- Remove dependency on `useAppInitialization`

### Step 3: Extract `useFriendsData` Hook

- Move friends and plants logic from `useAppInitialization`
- Return: `{ friendsData, plantedPlants, loading, error, refreshFriends }`

### Step 4: Create `useAvailablePlants` Hook (Lazy Load)

- Load available plants only when needed (PlantPicker opens)
- Return: `{ availablePlants, loading, error, fetchPlants }`

### Step 5: Update `home.tsx` with Optimized Staging

```typescript
// Stage 1: Core App Setup (Sequential)
const { currentUserId, userProfile, isInitialized } = useAppInitialization();

// Stage 2: Parallel Data Loading (when isInitialized is true)
const { weather, forecast } = useWeatherData(
    userProfile?.latitude,
    userProfile?.longitude,
    isInitialized
);
const { friendsData, plantedPlants } = useFriendsData(
    currentUserId,
    isInitialized
);

// Stage 3: Lazy Load (when user opens PlantPicker)
const {
    availablePlants,
    loading: plantsLoading,
    fetchPlants,
} = useAvailablePlants();
```

## Benefits

- ✅ **Fast Initial Render**: Profile loads first, available plants lazy loaded
- ✅ **Parallel Loading**: Weather and friends load simultaneously
- ✅ **No Race Conditions**: Clear dependency chain
- ✅ **No Duplicate API Calls**: Each service called once
- ✅ **Progressive Enhancement**: App works with partial data
- ✅ **Lazy Loading**: Available plants only loaded when needed
- ✅ **Performance Optimized**: Heavy operations run in parallel

## Files to Modify

1. `src/hooks/useFriendsData.ts` (new)
2. `src/hooks/useAvailablePlants.ts` (new - lazy load)
3. `src/hooks/useAppInitialization.ts` (simplify)
4. `src/hooks/useWeatherData.ts` (accept location param)
5. `src/app/home.tsx` (update hook usage)

## Testing Strategy

- Test each hook independently
- Test staged execution (core → parallel)
- Verify UserCard gets all data
- Test progressive loading states
- Ensure no performance regression
- Test error handling in each stage

## Approval Request

Should I proceed with Step 1 (simplifying `useAppInitialization`) to test this optimized staged approach?
