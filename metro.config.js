const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase v11 uses package.exports with a "react-native" condition.
// Without this flag, Metro resolves the "browser" entry which is missing
// getReactNativePersistence and other RN-specific exports.
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css' });
