module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      // DO NOT add 'nativewind/babel' here — it injects a DUPLICATE
      // @babel/plugin-transform-react-jsx with a different importSource,
      // which conflicts with the jsxImportSource set above.
      // The withNativeWind() wrapper in metro.config.js handles CSS interop.
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
