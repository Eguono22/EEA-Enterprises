const { existsSync } = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const routerStorePath = path.join(
  path.dirname(require.resolve('expo-router/package.json')),
  'build/global-state/router-store.js'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Sentry probes this optional internal API, which Expo Router 58 removed.
  // An empty module preserves Sentry's null-store fallback without Metro warnings.
  if (
    moduleName === 'expo-router/build/global-state/router-store' &&
    context.originModulePath.includes(`${path.sep}@sentry${path.sep}react-native${path.sep}`) &&
    !existsSync(routerStorePath)
  ) {
    return { type: 'empty' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
