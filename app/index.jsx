import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const EEA_URL = 'https://eea-enterprises.com/';
const CONTACT_PAGE_URL = `${EEA_URL}contact-us/`;
const EEA_HOSTNAME = new URL(EEA_URL).hostname.replace(/^www\./, '');
const LOADING_INDICATOR_TIMEOUT_MS = 15000;

function sanitizeUrl(url) {
  if (!url) return 'unknown';

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return String(url).split(/[?#]/, 1)[0];
  }
}

function trackEvent(name, data = {}) {
  const sanitizedData = Object.entries(data).reduce((result, [key, value]) => {
    result[key] = key.toLowerCase().includes('url') ? sanitizeUrl(value) : value;
    return result;
  }, {});

  Sentry.addBreadcrumb({
    category: 'analytics',
    type: 'info',
    level: 'info',
    message: name,
    data: sanitizedData,
  });

  if (__DEV__) {
    console.log(`[monitoring] ${name}`, sanitizedData);
  }
}

function captureMessage(message, data = {}, level = 'warning') {
  const sanitizedData = Object.entries(data).reduce((result, [key, value]) => {
    result[key] = key.toLowerCase().includes('url') ? sanitizeUrl(value) : value;
    return result;
  }, {});

  Sentry.withScope((scope) => {
    Object.entries(sanitizedData).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureMessage(message, level);
  });

  if (__DEV__) {
    console.log(`[monitoring:${level}] ${message}`, sanitizedData);
  }
}

function shouldOpenInApp(url) {
  if (!url) return true;

  try {
    const parsedUrl = new URL(url, EEA_URL);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    return ['http:', 'https:'].includes(parsedUrl.protocol) && hostname === EEA_HOSTNAME;
  } catch {
    return false;
  }
}

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const lastTrackedUrlRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(EEA_URL);

  // Handle Android hardware back button
  const handleBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  // Register the back handler on Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  useEffect(() => {
    trackEvent('home_screen_viewed', {
      initialUrl: EEA_URL,
      platform: Platform.OS,
    });
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    // Some pages keep third-party resources open after their content is usable.
    // Bound the indicator without stopping the page or hiding connection errors.
    const timeout = setTimeout(() => setIsLoading(false), LOADING_INDICATOR_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const openExternalLink = useCallback(async (url, eventName, metadata = {}) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        captureMessage('Contact shortcut unavailable', {
          url,
          ...metadata,
        });
        Alert.alert('Unavailable', 'This option is not available on this device.');
        return;
      }

      trackEvent(eventName, {
        url,
        ...metadata,
      });
      await Linking.openURL(url);
    } catch (error) {
      captureMessage('Failed to open contact shortcut', {
        url,
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert('Unable to Open', 'Please try again in a moment.');
    }
  }, []);

  const navigateToContactPage = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (webViewUrl === CONTACT_PAGE_URL) {
      webViewRef.current?.reload();
    } else {
      setWebViewUrl(CONTACT_PAGE_URL);
    }
    trackEvent('contact_page_opened', {
      url: CONTACT_PAGE_URL,
      source: 'native_cta',
    });
  }, [webViewUrl]);

  const handleShouldStartLoad = useCallback(
    (request) => {
      const nextUrl = request?.url;

      if (shouldOpenInApp(nextUrl)) {
        return true;
      }

      openExternalLink(nextUrl, 'external_link_opened', {
        source: 'webview',
      });
      return false;
    },
    [openExternalLink]
  );

  const handleReload = () => {
    trackEvent('webview_retry_tapped', {
      lastUrl: lastTrackedUrlRef.current ?? EEA_URL,
    });
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const screenOptions = { headerShown: false };

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webview}
          onLoadStart={(event) => {
            setIsLoading(true);
            trackEvent('webview_load_started', {
              url: event.nativeEvent.url ?? lastTrackedUrlRef.current ?? EEA_URL,
            });
          }}
          onLoadEnd={(event) => {
            setIsLoading(false);
            trackEvent('webview_load_finished', {
              url: event.nativeEvent.url ?? lastTrackedUrlRef.current ?? EEA_URL,
            });
          }}
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress >= 1) {
              setIsLoading(false);
            }
          }}
          onError={(event) => {
            const { nativeEvent } = event;
            setIsLoading(false);
            setHasError(true);
            captureMessage('WebView failed to load', {
              url: nativeEvent.url ?? lastTrackedUrlRef.current ?? EEA_URL,
              code: nativeEvent.code,
              description: nativeEvent.description,
            });
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 500 && nativeEvent.isTopFrame !== false) {
              setIsLoading(false);
              setHasError(true);
            }
            captureMessage('WebView HTTP error', {
              url: nativeEvent.url ?? lastTrackedUrlRef.current ?? EEA_URL,
              statusCode: nativeEvent.statusCode,
            });
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            if (!navState.loading) {
              setIsLoading(false);
            }
            const sanitizedUrl = sanitizeUrl(navState.url);
            if (lastTrackedUrlRef.current !== sanitizedUrl) {
              lastTrackedUrlRef.current = sanitizedUrl;
              trackEvent('webview_navigation_changed', {
                url: sanitizedUrl,
                canGoBack: navState.canGoBack,
                loading: navState.loading,
              });
            }
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={Platform.OS === 'android'}
        />
        {hasError && (
          <View style={styles.errorContainer} accessibilityLiveRegion="polite">
            <Text style={styles.errorTitle}>Unable to Connect</Text>
            <Text style={styles.errorMessage}>
              Please check your internet connection and try again.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retry loading the website"
              style={styles.retryButton}
              onPress={handleReload}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.contactOverlay} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contact EEA Enterprises"
            style={[styles.contactButton, { bottom: Math.max(insets.bottom + 16, 28) }]}
            onPress={() => {
              trackEvent('contact_cta_opened', {
                currentUrl: lastTrackedUrlRef.current ?? EEA_URL,
              });
              navigateToContactPage();
            }}
          >
            <Text style={styles.contactButtonLabel}>Contact Us</Text>
          </Pressable>
        </View>
        {isLoading && !hasError && (
          <View
            style={[styles.loadingIndicator, { top: insets.top + 12 }]}
            pointerEvents="none"
            accessibilityRole="progressbar"
            accessibilityLabel="Loading page"
          >
            <ActivityIndicator size="small" color="#1a3c5e" />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#10263c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  contactOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
  contactButton: {
    position: 'absolute',
    zIndex: 2,
    right: 20,
    backgroundColor: '#1a3c5e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#10263c',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  contactButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a3c5e',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#1a3c5e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
