module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const pluginsExistentes = (config.plugins ?? []).filter(
    (plugin) =>
      plugin !== "react-native-maps" &&
      !(Array.isArray(plugin) && plugin[0] === "react-native-maps"),
  );

  return {
    ...config,

    plugins: [
      ...pluginsExistentes,
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],

    android: {
      ...config.android,

      config: {
        ...(config.android?.config ?? {}),

        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
