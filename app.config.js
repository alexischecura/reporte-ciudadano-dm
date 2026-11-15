module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const pluginsExistentes = (config.plugins ?? []).filter(
    (plugin) =>
      plugin !== "react-native-maps" &&
      plugin !== "expo-sqlite" &&
      !(
        Array.isArray(plugin) &&
        ["react-native-maps", "expo-sqlite"].includes(plugin[0])
      ),
  );

  return {
    ...config,

    plugins: [
      ...pluginsExistentes,
      "expo-sqlite",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],

    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),

      config: {
        ...(config.android?.config ?? {}),

        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
