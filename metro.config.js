const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase v11 uses package.exports with a "react-native" condition.
// Without this flag, Metro resolves the "browser" entry which is missing
// getReactNativePersistence and other RN-specific exports.
config.resolver.unstable_enablePackageExports = true;

// Fix for Node 20 jest-worker deadlock
config.maxWorkers = 2;

module.exports = withNativeWind(config, { input: './global.css' });
