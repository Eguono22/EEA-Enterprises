import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production');
const TRACE_SAMPLE_RATE = Number.parseFloat(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'
);

let isMonitoringInitialized = false;
let isMonitoringEnabled = false;

export function sanitizeUrl(url) {
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

export function initMonitoring() {
  if (isMonitoringInitialized) {
    return isMonitoringEnabled;
  }

  isMonitoringInitialized = true;

  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log(
        '[monitoring] Sentry disabled. Set EXPO_PUBLIC_SENTRY_DSN to enable crash reporting.'
      );
    }
    return false;
  }

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

  isMonitoringEnabled = true;
  trackEvent('app_session_started', {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
  });

  return true;
}

export function trackEvent(name, data = {}) {
  const sanitizedData = sanitizeEventData(data);

  if (!isMonitoringEnabled) {
    if (__DEV__) {
      console.log(`[monitoring] ${name}`, sanitizedData);
    }
    return;
  }

  Sentry.addBreadcrumb({
    category: 'analytics',
    type: 'info',
    level: 'info',
    message: name,
    data: sanitizedData,
  });
}

export function captureMessage(message, data = {}, level = 'warning') {
  const sanitizedData = sanitizeEventData(data);

  if (!isMonitoringEnabled) {
    if (__DEV__) {
      console.log(`[monitoring:${level}] ${message}`, sanitizedData);
    }
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(sanitizedData).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureMessage(message, level);
  });
}

export function captureException(error, data = {}) {
  const sanitizedData = sanitizeEventData(data);

  if (!isMonitoringEnabled) {
    if (__DEV__) {
      console.log('[monitoring:error]', error, sanitizedData);
    }
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(sanitizedData).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}
