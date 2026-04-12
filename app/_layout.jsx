import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production');
const TRACE_SAMPLE_RATE = Number.parseFloat(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'
);

function sanitizeUrl(url) {
  if (!url) return 'unknown';

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return String(url).split(/[?#]/, 1)[0];
  }
}

function sanitizeEventData(data = {}) {
  return Object.entries(data).reduce((sanitized, [key, value]) => {
    sanitized[key] = key.toLowerCase().includes('url') ? sanitizeUrl(value) : value;
    return sanitized;
  }, {});
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: true,
    environment: APP_ENV,
    release: `eea-enterprises@${Constants.expoConfig?.version ?? 'unknown'}`,
    dist: Platform.OS,
    tracesSampleRate: Number.isFinite(TRACE_SAMPLE_RATE) ? TRACE_SAMPLE_RATE : 0.1,
    attachScreenshot: false,
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      if (!breadcrumb.data) {
        return breadcrumb;
      }

      return {
        ...breadcrumb,
        data: sanitizeEventData(breadcrumb.data),
      };
    },
  });

  Sentry.setTags({
    platform: Platform.OS,
    appEnv: APP_ENV,
    expoRuntime: Constants.executionEnvironment ?? 'unknown',
  });

  Sentry.addBreadcrumb({
    category: 'analytics',
    type: 'info',
    level: 'info',
    message: 'app_session_started',
    data: {
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS,
    },
  });
} else if (__DEV__) {
  console.log('[monitoring] Sentry disabled. Set EXPO_PUBLIC_SENTRY_DSN to enable crash reporting.');
}

function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a3c5e',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
        }}
      />
    </>
  );
}

export default Sentry.wrap(RootLayout);
