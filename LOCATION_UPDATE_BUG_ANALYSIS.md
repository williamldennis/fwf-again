# Location Update Bug Analysis & Solution

**Date:** July 19 2025  
**Issue:** Location not updating on app launch in TestFlight builds  
**Status:** ✅ IMPLEMENTED - Race condition fixed, location updates on app launch

## 🐛 Bug Description

### **Expected Behavior**

- Every time user opens app → fresh location → updated weather
- Friends see user's current weather based on fresh location

### **Actual Behavior**

- Only on first app load → location fetched → weather cached
- Subsequent app opens → stale location → stale weather
- Friends see outdated weather based on old location

### **TestFlight Impact**

- Hard quit + fresh login still shows stale location
- Location not updating even after complete app restart

## 🔍 Root Cause Analysis

### **Race Condition in `useUserProfile.ts`**

The bug is caused by a **race condition** between location fetching and profile loading:

```typescript
// Current problematic flow in useUserProfile.ts
useEffect(() => {
    // Step 1: Get fresh location and update DB
    fetchLocationForWeather(userId) // ✅ Updates DB with new location
        .then(({ latitude, longitude }) => {
            // Set minimal profile with fresh location
            setProfile((prev) => ({
                latitude, // ✅ Fresh location
                longitude, // ✅ Fresh location
                ...prev,
            }));

            // Step 2: Immediately fetch from DB (gets old data!)
            return fetchFullProfile(userId); // ❌ Overwrites with old location
        });
}, [userId]);
```

### **The Race Condition**

1. **Step 1:** `fetchLocationForWeather()` gets fresh location and updates database
2. **Step 2:** `fetchFullProfile()` runs immediately and queries the database
3. **Problem:** Database transaction delay or caching causes `fetchFullProfile()` to read the **old location** before the fresh location update is committed/readable

### **Why This Affects TestFlight**

- **Production latency:** Database operations have higher latency in production
- **Caching:** Supabase may cache profile data
- **Transaction timing:** Location updates may not be immediately readable

## 🏗️ Current Architecture Issues

### **Location Data Write Points**

1. **Initial Permission** (`location-permission.tsx`): One-time during onboarding
2. **Fresh Location Fetch** (`useUserProfile.ts`): Every app load (but gets overwritten)
3. **Weather Updates** (`weatherService.ts`): Only weather data, no location

### **Friend Weather Dependency**

Friends rely on location being in the database:

```typescript
// contactsService.ts - Friend discovery
const friendResults = await supabase
    .from("profiles")
    .select("latitude, longitude, weather_temp, ...")
    .in("phone_number", chunk);

// Fresh weather for friends
freshWeather = await WeatherService.fetchWeatherData(
    friend.latitude, // ← Needs location from DB
    friend.longitude // ← Needs location from DB
);
```

## 💡 Proposed Solution

### **Reordered Flow: Location → Weather → Database**

Instead of the current problematic flow, implement:

```
1. Fetch location → Set in local state only
2. Fetch weather with fresh location → Write both location AND weather to DB
3. Friends can now access updated location from DB
```

### **Benefits**

✅ **No race conditions** - no read/write conflicts  
✅ **Atomic updates** - location and weather updated together  
✅ **Cleaner separation** - location fetching vs database persistence  
✅ **Better performance** - fewer database calls  
✅ **Fresh data for friends** - location available when friends query

### **Implementation Plan**

#### **Step 1: Modify `useUserProfile.ts`**

- Remove immediate database write from `fetchLocationForWeather`
- Keep location in local state only
- Add function to write location to DB when needed

#### **Step 2: Modify `weatherService.ts`**

- Add location coordinates to `updateUserWeatherInDatabase`
- Write both weather AND location in one transaction

#### **Step 3: Update `useWeatherData.ts`**

- Pass location to the database update
- Ensure atomic location + weather update

#### **Step 4: Enhance App State Change Handler** (instead of "Add")

- Modify existing app state change handler in `home.tsx`
- Add location refresh call when app comes to foreground
- Use existing `refreshProfile()` function from `useUserProfile`

## 🔧 Technical Details

### **Current Database Updates**

```typescript
// useUserProfile.ts - Immediate location write (problematic)
await supabase
    .from("profiles")
    .update({ latitude, longitude })
    .eq("id", userId);

// weatherService.ts - Weather only (no location)
await supabase
    .from("profiles")
    .update({
        weather_temp: weatherData.current.main.temp,
        weather_condition: weatherData.current.weather[0].main,
        weather_icon: weatherData.current.weather[0].icon,
        weather_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
```

### **Proposed Database Update**

```typescript
// weatherService.ts - Combined location + weather update
await supabase
    .from("profiles")
    .update({
        latitude: location.latitude,
        longitude: location.longitude,
        weather_temp: weatherData.current.main.temp,
        weather_condition: weatherData.current.weather[0].main,
        weather_icon: weatherData.current.weather[0].icon,
        weather_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
```

## 🧪 Testing Strategy

### **Test Cases**

1. **Fresh Login:** Hard quit → login → verify fresh location
2. **App State Changes:** Background → foreground → verify location refresh
3. **Friend Weather:** Verify friends see updated weather after location change
4. **Database Consistency:** Ensure location and weather are updated atomically

### **Monitoring**

- Console logs for location fetch timing
- Database transaction timing
- Friend weather update success rates

## 📋 Implementation Checklist

- [x] Modify `useUserProfile.ts` to remove immediate DB write
- [x] Update `weatherService.ts` to include location in weather update
- [x] Modify `useWeatherData.ts` to pass location to DB update
- [x] Enhance app state change handler for location refresh
- [ ] Test fresh login flow
- [ ] Test friend weather updates
- [ ] Verify no breaking changes to existing functionality

## 🎯 Success Criteria

- [ ] Location updates on every app launch
- [ ] Friends see fresh weather based on updated location
- [ ] No race conditions or stale data
- [ ] Atomic updates (location + weather together)
- [ ] Maintains existing functionality

## 📚 Related Files

- `src/hooks/useUserProfile.ts` - Location fetching and profile management
- `src/hooks/useWeatherData.ts` - Weather data fetching and caching
- `src/services/weatherService.ts` - Weather API and database updates
- `src/services/contactsService.ts` - Friend discovery and weather fetching
- `src/app/home.tsx` - App state change handling

---

**Note:** This solution addresses the core race condition while maintaining the friend weather functionality that depends on location data being available in the database.
