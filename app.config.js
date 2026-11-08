module.exports = ({ config }) => ({
  ...config,
  plugins: config.plugins.map((plugin) =>
    plugin === '@sentry/react-native'
      ? [
          '@sentry/react-native/expo',
          {
            // Empty values deliberately retain Sentry's build-time env fallback.
            organization: process.env.SENTRY_ORG || '',
            project: process.env.SENTRY_PROJECT || '',
          },
        ]
      : plugin
  ),
});
