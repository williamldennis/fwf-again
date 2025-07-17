# Test Status

_Last updated: 2025-07-07_

## Summary Table

| Test Suite  | Status  | Coverage/Notes                                       |
| ----------- | ------- | ---------------------------------------------------- |
| Services    | ✅ Pass | All core service logic tested, including edge cases  |
| Integration | ✅ Pass | Critical path integration test covers main user flow |
| Hooks       | ✅ Pass | All custom hooks tested and passing                  |
| Components  | ⚠️ N/A  | Component tests removed due to dependency issues     |
| E2E/UI      | ⚠️ N/A  | No end-to-end or UI tests present                    |

## Details

### Services

- **All service tests are passing.**
- Includes: `growthService`, `timeCalculationService`, and weather bonus structure tests.
- Edge cases and regression scenarios (e.g., weather_bonus bug) are covered.

### Integration

- **Critical path integration test is passing.**
- Simulates the main user journey: authentication, location, weather, plants, growth, contacts.
- Mocks all external dependencies for reliability.
- Error handling for missing data, permissions, and API failures is tested.

### Hooks

- **All hook tests are passing.**
- Includes: `useAuth`, `useAvailablePlants`, `useWeatherData`, `useGardenData`, `useFriends`, `useUserProfile`.
- All custom hooks are properly tested with mocked dependencies.

### Components

- **Component tests removed due to dependency issues.**
- CardStack test was removed due to `react-native-reanimated-carousel` compatibility issues.
- Other component tests were previously removed due to React Native CSS interop issues.
- Recommend adding component tests after refactoring and stabilizing UI logic.

### E2E/UI

- **No end-to-end or UI tests are present.**
- Consider adding E2E tests (e.g., with Detox or Playwright) for full system coverage in the future.

## Recommendations

- Maintain and update service, integration, and hook tests as you refactor.
- Add component and E2E tests after refactoring for broader coverage.
- Use the integration test as a template for future user flows.

## Key Test Files

- `services/` - Service-level unit and regression tests
- `hooks/` - Custom hook tests
- `integration/criticalPath.test.ts` - Main integration test
- `integration/README.md` - Integration test documentation
- `services/README.md` - Service test documentation

---

**All critical logic is currently protected by passing tests. You are ready to refactor with confidence!**
