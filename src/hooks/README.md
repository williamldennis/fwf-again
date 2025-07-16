# Custom Hooks

This directory contains custom React hooks that extract business logic from components to improve testability and reusability.

## useAppInitialization

### Overview

The `useAppInitialization` hook extracts the app initialization logic from the `home.tsx` component. It handles:

- User authentication
- Available plants fetching
- Main data fetching (weather, contacts, friends, garden data)
- Plant growth updates
- Background sync setup (periodic updates and real-time subscriptions)

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need app initialization
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useAppInitialization } from '../hooks/useAppInitialization';

function Home() {
  const {
    // State
    currentUserId,
    availablePlants,
    loading,
    error,
    isInitialized,

    // Actions
    initializeApp,
    refreshData,
    clearError,
  } = useAppInitialization();

  useEffect(() => {
    initializeApp();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={clearError} />;
  }

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

### API

#### State

- `currentUserId: string | null` - The authenticated user's ID
- `availablePlants: any[]` - List of available plants for planting
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any
- `isInitialized: boolean` - Whether the app has completed initialization

#### Actions

- `initializeApp(): Promise<void>` - Initialize the app (fetch user, plants, data)
- `refreshData(): Promise<void>` - Refresh all app data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful initialization
- ✅ Error handling (no user, network errors, etc.)
- ✅ Background sync setup
- ✅ Cleanup on unmount
- ✅ Data refresh functionality

Run the tests with:

```bash
npm test -- --testPathPattern=useAppInitialization.test.ts
```

### Migration from home.tsx

This hook extracts the following logic from `home.tsx`:

1. **User Authentication**: `getCurrentUser()` function
2. **App Initialization**: `initializeApp()` function
3. **Data Fetching**: `fetchProfileAndWeather()` function
4. **Background Sync**: Periodic growth updates and real-time subscriptions
5. **State Management**: Loading, error, and initialization states

### Future Improvements

- Add caching for weather and forecast data
- Implement request deduplication
- Add optimistic updates for better UX
- Add retry logic for failed requests
- Add offline support
