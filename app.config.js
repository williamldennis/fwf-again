import 'dotenv/config';

export default {
  expo: {
    name: 'Fair Weather Friends',
    slug: 'fair-weather-friends',
    version: '1.0.0',
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    },
  },
};
