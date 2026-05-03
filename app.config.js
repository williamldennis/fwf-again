import "dotenv/config";

export default ({ config }) => ({
    ...config,
    name: "fwf",
    slug: "fwf",
    version: "1.0.14",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "fwf",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
        ...config.ios,
        supportsTablet: true,
        bundleIdentifier: "com.willydennis.fwf",
        buildNumber: "7",
        infoPlist: {
            NSContactsUsageDescription:
                "This app needs access to your contacts to help you connect with friends.",
            NSLocationWhenInUseUsageDescription:
                "This app needs your location to show you the weather.",
            NSLocationAlwaysAndWhenInUseUsageDescription:
                "This app needs your location to show you the weather even when the app is in the background.",
            NSLocationAlwaysUsageDescription:
                "This app needs your location to show your friends your weather even when the app is in the background.",
            NSCameraUsageDescription: "This app needs your camera to take selfies.",
            ITSAppUsesNonExemptEncryption: false,
        },
    },
    android: {
        ...config.android,
        adaptiveIcon: {
            foregroundImage: "./assets/images/adaptive-icon.png",
            backgroundColor: "#ffffff",
        },
        edgeToEdgeEnabled: true,
        package: "com.willydennis.fairweatherfriends",
        permissions: [
            ...(config.android?.permissions || []),
            "ACCESS_FINE_LOCATION",
            "ACCESS_BACKGROUND_LOCATION",
        ],
    },
    web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png",
    },
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                image: "./assets/images/splash-icon.png",
                imageWidth: 200,
                resizeMode: "contain",
                backgroundColor: "#ffffff",
            },
        ],
        "expo-video",
    ],
    experiments: {
        typedRoutes: true,
    },
    extra: {
        pocketbaseUrl:
            process.env.EXPO_PUBLIC_POCKETBASE_URL ||
            "http://localhost:8080",
        router: {},
        eas: {
            projectId: "85aaf47f-aa13-4b69-a2e4-42d51a2cef36",
        },
    },
});
