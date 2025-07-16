# Testing Infrastructure Documentation

## Overview

This document outlines the testing infrastructure set up for the Fair Weather Friends app. The testing setup includes Jest, React Native Testing Library, and comprehensive mocking for Expo modules and external dependencies.

## Test Structure

```
src/
├── __tests__/
│   ├── services/
│   │   ├── growthService.test.ts          # Growth calculation tests
│   │   ├── timeCalculationService.test.ts # Time calculation tests
│   │   └── simple.test.ts                 # Basic infrastructure test
│   ├── components/
│   │   └── GardenArea.test.tsx            # Component tests
│   └── app/
│       └── home.test.tsx                  # Integration tests
```

## Running Tests

### Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only service tests
npm run test:services

# Run only component tests
npm run test:components

# Run only integration tests
npm run test:integration

# Run tests in CI mode
npm run test:ci
```

### Test Coverage Goals

- **Global Coverage**: 80% (branches, functions, lines, statements)
- **Service Coverage**: 90% (branches, functions, lines, statements)

## Test Categories

### 1. Service Tests

Service tests focus on business logic and data processing functions. These are pure functions that should be highly testable.

#### GrowthService Tests

- Weather bonus calculations
- Growth stage progression
- Plant maturity detection
- Data validation

#### TimeCalculationService Tests

- Time elapsed calculations
- Time to maturity calculations
- Time formatting functions

### 2. Component Tests

Component tests verify UI behavior and user interactions.

#### GardenArea Tests

- Rendering garden slots
- Plant placement interactions
- Garden full state handling

### 3. Integration Tests

Integration tests verify that different parts of the application work together correctly.

#### Home Component Tests

- Data loading and state management
- Error handling
- User authentication flow

## Mocking Strategy

### Expo Modules

All Expo modules are mocked in `jest.setup.js`:

- `expo-location`
- `expo-contacts`
- `expo-haptics`
- `expo-image`
- `expo-router`

### External Dependencies

- **Supabase**: Mocked with a chainable query builder
- **React Navigation**: Mocked navigation functions
- **React Native Reanimated**: Mocked with the official mock
- **Fetch API**: Mocked for HTTP requests

### Environment Variables

- `EXPO_PUBLIC_OPENWEATHER_API_KEY`: Set to 'test-api-key'

## Test Data Factories

### Plant Data

```typescript
const mockPlant: Plant = {
    id: "1",
    name: "Sunflower",
    growth_time_hours: 24,
    weather_bonus: {
        sunny: 1.5,
        cloudy: 1.0,
        rainy: 0.8,
    },
    image_path: "/plants/sunflower",
    harvest_points: 10,
    created_at: "2024-01-01T00:00:00Z",
};
```

### Planted Plant Data

```typescript
const mockPlantedPlant: PlantedPlant = {
    id: "1",
    garden_owner_id: "user1",
    planter_id: "user2",
    plant_id: "1",
    current_stage: 2,
    is_mature: false,
    planted_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
};
```

## Testing Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Arrange tests in a logical order (setup, execution, assertion)

### 2. Mocking

- Mock external dependencies at the module level
- Use `jest.clearAllMocks()` in `beforeEach` to reset mock state
- Mock only what's necessary for the test

### 3. Assertions

- Use specific assertions that test the exact behavior
- Test both positive and negative cases
- Verify error conditions and edge cases

### 4. Test Data

- Use consistent test data across related tests
- Create factory functions for complex test objects
- Avoid hardcoding values that might change

## Common Test Patterns

### Service Function Testing

```typescript
describe("ServiceName", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should perform expected behavior", () => {
        // Arrange
        const input = "test input";

        // Act
        const result = ServiceName.method(input);

        // Assert
        expect(result).toBe("expected output");
    });
});
```

### Component Testing

```typescript
describe('ComponentName', () => {
  const mockProps = {
    // ... props
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByTestId } = render(<ComponentName {...mockProps} />);
    expect(getByTestId('component-id')).toBeTruthy();
  });

  it('should handle user interactions', () => {
    const mockCallback = jest.fn();
    const { getByTestId } = render(
      <ComponentName {...mockProps} onPress={mockCallback} />
    );

    fireEvent.press(getByTestId('button'));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
describe('Integration Test', () => {
  beforeEach(() => {
    // Mock external dependencies
    mockSupabase();
    mockFetch(mockResponse);
  });

  it('should load data successfully', async () => {
    const { getByTestId } = render(<Component />);

    await waitFor(() => {
      expect(getByTestId('loaded-content')).toBeTruthy();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Date Mocking Issues**: The TimeCalculationService has complex date handling that can be difficult to mock. Consider testing the business logic separately from the date calculations.

2. **Component Import Errors**: Ensure all Expo modules are properly mocked in `jest.setup.js`.

3. **Async Test Failures**: Use `waitFor` for asynchronous operations and ensure proper cleanup in `afterEach`.

### Debugging Tests

1. **Verbose Output**: Run tests with `--verbose` flag for more detailed output
2. **Single Test**: Use `--testNamePattern` to run specific tests
3. **Watch Mode**: Use `npm run test:watch` for interactive debugging

## Future Improvements

1. **E2E Testing**: Add end-to-end tests using Detox or similar framework
2. **Visual Regression Testing**: Add snapshot testing for UI components
3. **Performance Testing**: Add tests for performance-critical functions
4. **Accessibility Testing**: Add tests for accessibility compliance

## Pre-Refactoring Test Checklist

Before starting the refactoring process, ensure:

1. ✅ All existing tests pass
2. ✅ Test coverage meets minimum thresholds
3. ✅ Critical user flows are tested
4. ✅ Error conditions are covered
5. ✅ Edge cases are handled

## Post-Refactoring Test Checklist

After refactoring, verify:

1. ✅ All existing tests still pass
2. ✅ New functionality has corresponding tests
3. ✅ Test coverage hasn't decreased
4. ✅ Performance hasn't regressed
5. ✅ Integration points work correctly

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Expo Testing Guide](https://docs.expo.dev/guides/testing/)
- [Jest Expo Preset](https://github.com/expo/expo/tree/main/packages/jest-expo)
