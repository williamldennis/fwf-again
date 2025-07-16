# Test Suite Overview

This directory contains all automated tests for the Fair Weather Friends app. The tests are organized by type and coverage area to ensure reliability and maintainability as the codebase evolves.

## Structure

- `services/` — Unit and regression tests for core business logic and services
- `integration/` — Integration tests simulating main user flows and service interactions
- `components/` — (Currently empty) — For future component/UI tests
- `app/` — (Optional) — For app-level or screen-level tests
- `utils/` — (Optional) — For utility/helper function tests

## Key Documentation

- `services/README.md` — Service test coverage, bug regression tests, and rationale
- `integration/README.md` — Integration test coverage, critical path flow, and rationale
- `TEST_STATUS.md` — Up-to-date status of all test suites, coverage, and recommendations

## Running Tests

- **All tests:**
    ```bash
    npm test
    ```
- **Service tests only:**
    ```bash
    npm run test:services
    ```
- **Integration tests only:**
    ```bash
    npm test -- --testPathPattern=integration
    ```

## Current Coverage

- All core service logic and the main user journey are protected by passing tests.
- Component and E2E/UI tests are not present (see `TEST_STATUS.md` for details).

## Recommendations

- Maintain and update tests as you refactor.
- Add component and E2E tests for broader coverage after refactoring.
- Use the integration test as a template for future user flows.

---

**For more details, see the individual README files in each subfolder and `TEST_STATUS.md`.**
