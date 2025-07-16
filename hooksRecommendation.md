# Hooks Refactor Recommendation

## Problem

- `useAppInitialization` is doing too much (weather, friends, plants, profile)
- `useWeatherData` depends on coordinates from `useAppInitialization`
- UserCard missing weather data due to dependency chain
- Sequential execution instead of parallel
- **NEW: Planting and harvesting trigger full app re-initialization** - This is the critical issue

## Root Cause Analysis

### Current Problem: Monolithic Hook Architecture

The `useAppInitialization` hook is a monolithic component that:

- Handles user auth, profile, friends, plants, weather, and growth updates
- Calls `refreshData()` after any change, which re-fetches ALL data
- Sets global loading state for any update, causing full screen re-renders
- Makes targeted updates impossible

### Specific Issues

1. **Planting a plant** → calls `refreshData()` → re-fetches user profile, all friends, all plants
2. **Harvesting a plant** → calls `refreshData()` → re-fetches user profile, all friends, all plants
3. **Real-time subscription** exists but doesn't actually update local state
4. **No granular updates** - every change requires full data refresh

## Recommended Solution: Separate, Focused Hooks

### Proposed Hook Architecture

Instead of one monolithic hook, create several focused hooks that work together:

```
useAuth (authentication only)
├── User authentication state
└── Current user ID

useUserProfile (user data only)
├── Profile data (selfie URLs, points, location)
├── Points updates (after harvest)
└── Profile updates

useFriends (social data only)
├── Friends list
├── Friend profiles
└── Friend discovery

useGardenData (planted plants for user + friends)
├── Current user's planted plants
├── Friends' planted plants
├── Single garden updates (when planting/harvesting)
├── Real-time plant changes
└── Growth updates

useAvailablePlants (lazy loaded)
├── Available plants for planting
├── Load only when PlantPicker opens
└── Cached after first load

useWeatherData (weather only - already exists)
├── Current weather
├── Forecast data
└── Weather caching
```

### Benefits of This Approach

- ✅ **Single Responsibility** - Each hook has one clear purpose
- ✅ **Targeted Updates** - Only affected hooks re-render
- ✅ **No Full Re-initialization** - Planting/harvesting only updates relevant data
- ✅ **Better Performance** - No unnecessary re-fetches
- ✅ **Easier Testing** - Test each hook independently
- ✅ **More Flexible** - Can use only what you need
- ✅ **Real-time Updates** - Each hook can handle its own real-time subscriptions

## Implementation Plan

### Step 1: Create `useAuth` Hook ✅ COMPLETED

- Extract user authentication logic from `useAppInitialization`
- Return: `{ user, currentUserId, isAuthenticated, loading, error }`

### Step 2: Create `useUserProfile` Hook ✅ COMPLETED

- Extract profile management from `useAppInitialization`
- Include points update function for harvesting
- Return: `{ profile, updatePoints, updateProfile, refreshProfile, loading, error }`

### Step 3: Create `useFriends` Hook ✅ COMPLETED

- Extract friends data logic from `useAppInitialization`
- Handle friend discovery and contact processing
- Return: `{ friends, refreshFriends, refreshContacts, loading, error }`

### Step 4: Create `useGardenData` Hook ✅ COMPLETED

- Extract planted plants logic from `useAppInitialization`
- Include targeted update functions
- Handle real-time subscriptions properly
- Return: `{ plantedPlants, updateSingleGarden, updateAllGardens, updateGrowth, loading, error }`

### Step 5: Create `useAvailablePlants` Hook (Lazy Load) ✅ COMPLETED

- Load available plants only when PlantPicker opens
- Cache after first load
- Return: `{ availablePlants, fetchPlants, refreshPlants, loading, error, hasLoaded }`
- **Status:** Hook created with comprehensive tests passing (11/11 tests)

### Step 6: Update `useWeatherData` Hook

- Accept location as parameter instead of depending on `useAppInitialization`
- Return: `{ weather, forecast, fetchWeather, loading, error }`

### Step 7: Simplify `useAppInitialization` (or remove entirely)

- Keep only core app state management
- Or remove and use individual hooks directly

### Step 8: Update `home.tsx` with New Hook Usage

```typescript
// Individual hooks for specific data
const { user, currentUserId } = useAuth();
const { profile, updatePoints } = useUserProfile(currentUserId);
const { friends } = useFriends(currentUserId);
const { plantedPlants, updateSingleGarden } = useGardenData(currentUserId);
const { availablePlants, fetchPlants } = useAvailablePlants();
const { weather, forecast } = useWeatherData(
    profile?.latitude,
    profile?.longitude
);

// After planting - only update affected garden
const handlePlantHarvested = async () => {
    await updatePoints(); // Update user points
    // Real-time subscription will handle plant removal automatically
};

const handleSelectPlant = async (plantId: string) => {
    // ... planting logic ...
    if (newPlant) {
        await updateSingleGarden(friendId); // Only update this garden
    }
};
```

## Files to Create/Modify

### New Files

1. `src/hooks/useAuth.ts`
2. `src/hooks/useUserProfile.ts`
3. `src/hooks/useFriends.ts`
4. `src/hooks/useGardenData.ts`
5. `src/hooks/useAvailablePlants.ts`

### Modified Files

1. `src/hooks/useAppInitialization.ts` (simplify or remove)
2. `src/hooks/useWeatherData.ts` (accept location param)
3. `src/app/home.tsx` (update hook usage)
4. `src/components/PlantDetailsModal.tsx` (use new hooks)
5. `src/components/GardenArea.tsx` (use new hooks)

## Testing Strategy

- Test each hook independently
- Test targeted updates (planting/harvesting only updates relevant data)
- Verify no full app re-initialization on data changes
- Test real-time subscriptions work properly
- Ensure progressive loading states work
- Test error handling in each hook
- Performance testing to ensure no regression

## Migration Strategy

1. **Phase 1**: Create new hooks alongside existing `useAppInitialization`
2. **Phase 2**: Gradually migrate components to use new hooks
3. **Phase 3**: Remove `useAppInitialization` once migration complete
4. **Phase 4**: Optimize and add real-time subscriptions to each hook

## Approval Request

Should I proceed with Step 1 (creating `useAuth` hook) to begin this refactoring approach?
