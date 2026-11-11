// Expo's default config already understands pnpm monorepos (watchFolders,
// node_modules lookup) and package "exports"; NativeWind adds Tailwind support.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
