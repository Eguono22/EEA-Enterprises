import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
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
const CONTACT_PAGE_URL = process.env.EXPO_PUBLIC_CONTACT_URL ?? `${EEA_URL}contact`;
const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL?.trim() ?? '';
const CONTACT_PHONE = process.env.EXPO_PUBLIC_CONTACT_PHONE?.trim() ?? '';
const CONTACT_WHATSAPP = process.env.EXPO_PUBLIC_CONTACT_WHATSAPP?.trim() ?? '';
const QUOTE_EMAIL_SUBJECT =
  process.env.EXPO_PUBLIC_QUOTE_EMAIL_SUBJECT?.trim() ?? 'Quote Request from the EEA Enterprises App';
const QUOTE_EMAIL_BODY =
  process.env.EXPO_PUBLIC_QUOTE_EMAIL_BODY?.trim() ??
  'Hello EEA Enterprises,%0D%0A%0D%0AI would like to request a quote.%0D%0A%0D%0AName:%0D%0ACompany:%0D%0APhone:%0D%0AProject details:%0D%0A';

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

function normalizePhoneNumber(value) {
  return value.replace(/[^\d+]/g, '');
}

function normalizeWhatsAppNumber(value) {
  return value.replace(/\D/g, '');
}

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const lastTrackedUrlRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isContactSheetVisible, setIsContactSheetVisible] = useState(false);
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

  const openExternalLink = useCallback(async (url, eventName, metadata = {}) => {
    setIsContactSheetVisible(false);

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
    setIsContactSheetVisible(false);
    setHasError(false);
    setIsLoading(true);
    setWebViewUrl(CONTACT_PAGE_URL);
    trackEvent('contact_page_opened', {
      url: CONTACT_PAGE_URL,
      source: 'native_cta',
    });
  }, []);

  const contactActions = [
    {
      key: 'contact-page',
      label: 'Open Contact Page',
      description: 'Jump straight to the website contact page in the app.',
      onPress: navigateToContactPage,
    },
    ...(CONTACT_EMAIL
      ? [
          {
            key: 'quote-email',
            label: 'Request a Quote',
            description: 'Open your email app with a prefilled quote request.',
            onPress: () =>
              openExternalLink(
                `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(QUOTE_EMAIL_SUBJECT)}&body=${QUOTE_EMAIL_BODY}`,
                'quote_request_started',
                { channel: 'email' }
              ),
          },
        ]
      : []),
    ...(CONTACT_PHONE
      ? [
          {
            key: 'phone',
            label: 'Call Us',
            description: CONTACT_PHONE,
            onPress: () =>
              openExternalLink(`tel:${normalizePhoneNumber(CONTACT_PHONE)}`, 'contact_call_started', {
                channel: 'phone',
              }),
          },
        ]
      : []),
    ...(CONTACT_WHATSAPP
      ? [
          {
            key: 'whatsapp',
            label: 'WhatsApp',
            description: 'Start a WhatsApp chat with the team.',
            onPress: () =>
              openExternalLink(
                `https://wa.me/${normalizeWhatsAppNumber(CONTACT_WHATSAPP)}`,
                'contact_whatsapp_started',
                { channel: 'whatsapp' }
              ),
          },
        ]
      : []),
  ];

  const handleReload = () => {
    trackEvent('webview_retry_tapped', {
      lastUrl: lastTrackedUrlRef.current ?? EEA_URL,
    });
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const screenOptions = { headerShown: false };

  if (hasError) {
    return (
      <>
        <Stack.Screen options={screenOptions} />
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
          <Text style={styles.errorTitle}>Unable to Connect</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

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
            if (nativeEvent.statusCode >= 500) {
              setHasError(true);
            }
            captureMessage('WebView HTTP error', {
              url: nativeEvent.url ?? lastTrackedUrlRef.current ?? EEA_URL,
              statusCode: nativeEvent.statusCode,
            });
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
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
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit={Platform.OS === 'android'}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a3c5e" />
            </View>
          )}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact EEA Enterprises"
          style={[styles.contactButton, { bottom: Math.max(insets.bottom + 16, 28) }]}
          onPress={() => {
            trackEvent('contact_cta_opened', {
              currentUrl: lastTrackedUrlRef.current ?? EEA_URL,
            });
            setIsContactSheetVisible(true);
          }}
        >
          <Text style={styles.contactButtonLabel}>Contact Us</Text>
        </Pressable>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1a3c5e" />
          </View>
        )}
      </View>
      <Modal
        animationType="slide"
        visible={isContactSheetVisible}
        transparent
        onRequestClose={() => setIsContactSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsContactSheetVisible(false)}>
          <Pressable
            style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}
            onPress={() => {}}
          >
            <Text style={styles.sheetTitle}>Get in Touch</Text>
            <Text style={styles.sheetSubtitle}>
              Choose the fastest way to reach EEA Enterprises.
            </Text>
            {contactActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.sheetAction}
                onPress={action.onPress}
              >
                <Text style={styles.sheetActionLabel}>{action.label}</Text>
                <Text style={styles.sheetActionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setIsContactSheetVisible(false)}
            >
              <Text style={styles.sheetCloseLabel}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  contactButton: {
    position: 'absolute',
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a3c5e',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555555',
    marginBottom: 20,
  },
  sheetAction: {
    borderWidth: 1,
    borderColor: '#d8e1ea',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  sheetActionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a3c5e',
    marginBottom: 4,
  },
  sheetActionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5b6670',
  },
  sheetCloseButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  sheetCloseLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5b6670',
  },
  errorContainer: {
    flex: 1,
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
