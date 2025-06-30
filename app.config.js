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
      // ...add other usage descriptions as needed
    },
  },
  android: {
    ...config.android,
    package: "com.willydennis.fairweatherfriends",
    // ...other android config
  },
});
