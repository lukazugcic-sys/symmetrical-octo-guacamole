module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin mora biti zadnji plugin u listi
    plugins: ['react-native-reanimated/plugin'],
  };
};
