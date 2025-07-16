# Weather Bonus Structure Tests

## Overview

This test suite was created to prevent a specific bug that occurred in the `PlantDetailsModal` component where the `weather_bonus` object structure was being corrupted, leading to NaN values in growth calculations.

## The Bug

### What Happened

In `PlantDetailsModal.tsx`, the code was incorrectly overwriting the `weather_bonus` object with a number:

```typescript
// ❌ BUGGY CODE
const plantObject = {
    ...plant,
    weather_bonus: GrowthService.getWeatherBonus(plant, friendWeather), // This returns a number!
};
```

### Why It Caused Problems

1. `GrowthService.getWeatherBonus()` returns a number (e.g., 1.8)
2. This number was assigned to `weather_bonus` property
3. On subsequent calls, `weather_bonus` was no longer an object
4. `weather_bonus['cloudy']` returned `undefined`
5. `undefined * hoursElapsed = NaN`
6. All growth calculations became invalid

### The Fix

```typescript
// ✅ FIXED CODE
const plantObject = {
    ...plant,
    weather_bonus: plant.weather_bonus, // Keep the original object structure
};
```

## Test Coverage

### 1. Basic Functionality Tests

- ✅ `should preserve weather_bonus object structure`
- ✅ `should handle different weather conditions correctly`
- ✅ `should return default value for unknown weather`
- ✅ `should handle case insensitive weather conditions`

### 2. Data Structure Validation Tests

- ✅ `should handle weather_bonus that is not an object`
- ✅ `should handle missing weather_bonus property`
- ✅ `should handle weather_bonus with missing weather types`

### 3. Integration Tests

- ✅ `should detect when weather_bonus object structure is corrupted`
- ✅ `should verify the fix preserves object structure`
- ✅ `should verify that corrupted weather_bonus causes NaN in calculations`

## Key Test Scenarios

### Scenario 1: Normal Operation

```typescript
const plant = {
    weather_bonus: { sunny: 0.7, cloudy: 1.8, rainy: 1.3 },
};
const result = GrowthService.getWeatherBonus(plant, "Clouds");
expect(result).toBe(1.8); // ✅ Works correctly
```

### Scenario 2: Bug Simulation

```typescript
const plant = {
    weather_bonus: { sunny: 0.7, cloudy: 1.8, rainy: 1.3 },
};
const firstCall = GrowthService.getWeatherBonus(plant, "Clouds"); // Returns 1.8

// Simulate the bug
const buggyPlant = {
    ...plant,
    weather_bonus: firstCall, // Now weather_bonus is 1.8 (number)
};

const secondCall = GrowthService.getWeatherBonus(buggyPlant, "Clouds");
expect(secondCall).toBe(undefined); // ✅ Detects the corruption
```

### Scenario 3: NaN Propagation

```typescript
const weatherBonus = undefined; // From corrupted weather_bonus
const hoursElapsed = 1;
const adjustedHours = hoursElapsed * weatherBonus;
expect(adjustedHours).toBeNaN(); // ✅ Shows the downstream effect
```

## Prevention Strategy

### 1. Type Safety

- The `Plant` type enforces `weather_bonus` as an object
- TypeScript compilation catches type mismatches

### 2. Runtime Validation

- Tests verify that `weather_bonus` remains an object
- Tests check that accessing properties returns expected values

### 3. Integration Testing

- Tests simulate the exact data flow that caused the bug
- Tests verify that fixes prevent the corruption

### 4. Documentation

- This README documents the bug and fix
- Code comments explain the importance of preserving object structure

## Running the Tests

```bash
# Run all service tests
npm run test:services

# Run just the weather bonus tests
npm test -- --testNamePattern="Weather Bonus Object Structure Tests"

# Run with verbose output
npm run test:services -- --verbose
```

## Future Improvements

1. **Add Type Guards**: Create runtime type checking functions
2. **Immutable Data**: Use libraries like Immer to prevent accidental mutations
3. **Property Validation**: Add validation to ensure all required weather types exist
4. **Error Boundaries**: Add error handling for corrupted data structures

## Related Files

- `src/services/growthService.ts` - The service being tested
- `src/components/PlantDetailsModal.tsx` - Where the bug was fixed
- `src/types/garden.ts` - Type definitions for Plant interface
