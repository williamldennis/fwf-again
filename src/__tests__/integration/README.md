# Critical Path Integration Test

## Overview

This integration test simulates the main user flow through the Fair Weather Friends app, ensuring that all core services and data flows work together as expected. It mocks all external dependencies (APIs, device services, database) and verifies that your app logic is robust and reliable.

## What the Test Covers

- **User Authentication:** Mocks a logged-in user session.
- **Location Services:** Mocks device location and permission checks.
- **Weather API:** Mocks fetching current weather and forecast for the user's location.
- **Reverse Geocoding:** Mocks city name lookup from coordinates.
- **User Profile:** Mocks fetching the user's profile from the database.
- **Plant Data:** Mocks fetching available plants and the user's planted plants.
- **Growth Calculations:** Calls real `GrowthService` and `TimeCalculationService` logic to calculate plant growth, progress, and time to maturity.
- **Contacts:** Mocks fetching device contacts.
- **Error Handling:** Verifies that the app handles missing data, denied permissions, and failed API calls gracefully.

## Why This Test Is Important

- **Prevents Regressions:** If you break the main user flow during refactoring, this test will fail and alert you immediately.
- **Documents the Happy Path:** Serves as living documentation for how the main app logic is expected to work.
- **Confidence for Refactoring:** Lets you safely refactor services and logic, knowing that the most important user journey is protected.
- **Catches Integration Bugs:** Ensures that data passed between services is valid and that the overall flow works end-to-end (with mocks for external systems).

## How to Run

```bash
npm test -- --testPathPattern=integration
```

## Test File

- `src/__tests__/integration/criticalPath.test.ts`

## Next Steps

- Add more integration tests for other user flows as needed
- Use this test as a template for future features
- Keep this test up to date as your app evolves
