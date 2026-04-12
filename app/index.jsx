import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { captureMessage, trackEvent, sanitizeUrl } from '../lib/monitoring';

const EEA_URL = 'https://eea-enterprises.com/';

export default function HomeScreen() {
  const webViewRef = useRef(null);
  const lastTrackedUrlRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
          source={{ uri: EEA_URL }}
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
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1a3c5e" />
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
