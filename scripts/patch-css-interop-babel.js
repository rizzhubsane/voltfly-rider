/**
 * react-native-css-interop's babel preset pulls in `react-native-worklets/plugin`
 * (Reanimated 4+). On Reanimated 3 that entry breaks Metro/Babel with:
 * ".plugins is not a valid Plugin property". Strip it after npm install.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'react-native-css-interop', 'babel.js');

try {
  let src = fs.readFileSync(target, 'utf8');
  if (!src.includes('react-native-worklets/plugin')) {
    process.exit(0);
  }
  src = src.replace(
    /\s*\/\/ Use this plugin in reanimated 4 and later\s*\n\s*"react-native-worklets\/plugin",/,
    '\n      // Patched for Reanimated 3 (worklets plugin is Reanimated 4+ only)',
  );
  fs.writeFileSync(target, src);
  console.log('[patch-css-interop-babel] Patched react-native-css-interop/babel.js for Reanimated 3.');
} catch (e) {
  if (e.code === 'ENOENT') {
    process.exit(0);
  }
  throw e;
}
