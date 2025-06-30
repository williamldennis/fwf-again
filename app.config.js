import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "fwf",
  slug: "fwf",
  version: '1.0.0',
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "com.willydennis.fwf",
    supportsTablet: true,
    infoPlist: {
      NSContactsUsageDescription: "This app needs access to your contacts to help you connect with friends.",
      NSLocationWhenInUseUsageDescription: "This app needs your location to show you the weather.",
    },
  },
  android: {
    ...config.android,
    package: "com.willydennis.fairweatherfriends",
    permissions: [
      ...(config.android?.permissions || []),
      "ACCESS_FINE_LOCATION",
    ],
  },
});
