# Custom Hooks

This directory contains custom React hooks that extract business logic from components to improve testability and reusability.

## useAuth

### Overview

The `useAuth` hook handles user authentication and session management.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need authentication
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useAuth } from '../hooks/useAuth';

function Login() {
  const {
    // State
    currentUserId,
    loading,
    error,
    isAuthenticated,

    // Actions
    login,
    logout,
    clearError,
  } = useAuth();

  useEffect(() => {
    login();
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
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any
- `isAuthenticated: boolean` - Whether the user is currently authenticated

#### Actions

- `login(): Promise<void>` - Initiate user login
- `logout(): void` - Clear user session and authentication state
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful login
- ✅ Error handling (network errors, etc.)
- ✅ Session management
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useAuth.test.ts
```

## useUserProfile

### Overview

The `useUserProfile` hook fetches and manages user profile data.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need user profile data
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useUserProfile } from '../hooks/useUserProfile';

function Profile() {
  const {
    // State
    userProfile,
    loading,
    error,

    // Actions
    fetchProfile,
    clearError,
  } = useUserProfile();

  useEffect(() => {
    fetchProfile();
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

- `userProfile: any | null` - The fetched user profile data
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any

#### Actions

- `fetchProfile(): Promise<void>` - Fetch the user's profile data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful profile fetch
- ✅ Error handling (network errors, etc.)
- ✅ Loading states
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useUserProfile.test.ts
```

## useFriends

### Overview

The `useFriends` hook fetches and manages user friends data.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need user friends data
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useFriends } from '../hooks/useFriends';

function Friends() {
  const {
    // State
    friends,
    loading,
    error,

    // Actions
    fetchFriends,
    clearError,
  } = useFriends();

  useEffect(() => {
    fetchFriends();
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

- `friends: any[] | null` - The fetched friends data
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any

#### Actions

- `fetchFriends(): Promise<void>` - Fetch the user's friends data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful friends fetch
- ✅ Error handling (network errors, etc.)
- ✅ Loading states
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useFriends.test.ts
```

## useGardenData

### Overview

The `useGardenData` hook fetches and manages user garden data.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need user garden data
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useGardenData } from '../hooks/useGardenData';

function Garden() {
  const {
    // State
    gardenData,
    loading,
    error,

    // Actions
    fetchGardenData,
    clearError,
  } = useGardenData();

  useEffect(() => {
    fetchGardenData();
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

- `gardenData: any | null` - The fetched garden data
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any

#### Actions

- `fetchGardenData(): Promise<void>` - Fetch the user's garden data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful garden data fetch
- ✅ Error handling (network errors, etc.)
- ✅ Loading states
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useGardenData.test.ts
```

## useAvailablePlants

### Overview

The `useAvailablePlants` hook fetches and manages available plants data.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need available plants data
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useAvailablePlants } from '../hooks/useAvailablePlants';

function AvailablePlants() {
  const {
    // State
    availablePlants,
    loading,
    error,

    // Actions
    fetchAvailablePlants,
    clearError,
  } = useAvailablePlants();

  useEffect(() => {
    fetchAvailablePlants();
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

- `availablePlants: any[] | null` - The fetched available plants data
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any

#### Actions

- `fetchAvailablePlants(): Promise<void>` - Fetch the available plants data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful available plants fetch
- ✅ Error handling (network errors, etc.)
- ✅ Loading states
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useAvailablePlants.test.ts
```

## useWeatherData

### Overview

The `useWeatherData` hook fetches and manages weather data.

### Benefits

- ✅ **Testability**: Isolated business logic that can be unit tested independently
- ✅ **Reusability**: Can be used in other components that need weather data
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Error Handling**: Centralized error management
- ✅ **Loading States**: Consistent loading state management

### Usage

```typescript
import { useWeatherData } from '../hooks/useWeatherData';

function Weather() {
  const {
    // State
    weatherData,
    loading,
    error,

    // Actions
    fetchWeatherData,
    clearError,
  } = useWeatherData();

  useEffect(() => {
    fetchWeatherData();
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

- `weatherData: any | null` - The fetched weather data
- `loading: boolean` - Whether the app is currently loading
- `error: string | null` - Current error message, if any

#### Actions

- `fetchWeatherData(): Promise<void>` - Fetch the weather data
- `clearError(): void` - Clear the current error state

### Testing

The hook includes comprehensive tests covering:

- ✅ Successful weather data fetch
- ✅ Error handling (network errors, etc.)
- ✅ Loading states
- ✅ Cleanup on unmount

Run the tests with:

```bash
npm test -- --testPathPattern=useWeatherData.test.ts
```

### Legacy useAppInitialization hook has been removed in favor of focused hooks.
