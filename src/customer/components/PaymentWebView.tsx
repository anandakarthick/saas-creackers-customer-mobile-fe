import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../theme';

/** Parse a URL's query string into a flat object (Hermes-safe, no URLSearchParams). */
function parseQuery(url: string): Record<string, string> {
  const q = url.split('?')[1];
  if (!q) return {};
  const out: Record<string, string> = {};
  q.split('#')[0]
    .split('&')
    .forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    });
  return out;
}

/**
 * Shows the payment gateway's redirectUrl in a modal WebView. When the gateway
 * redirects back to `returnUrl` (the storefront payment-callback), we intercept
 * it, hand the query params back to the caller (which calls verifyPayment), and
 * stop the WebView from loading the callback page itself.
 */
export function PaymentWebView({
  visible,
  url,
  returnUrl,
  onReturn,
  onCancel,
}: {
  visible: boolean;
  url: string;
  returnUrl: string;
  onReturn: (params: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const handled = useRef(false);

  // Reset the one-shot guard each time a new payment starts.
  useEffect(() => {
    if (visible) handled.current = false;
  }, [visible, url]);

  const intercept = (navUrl: string): boolean => {
    if (!handled.current && navUrl.startsWith(returnUrl)) {
      handled.current = true;
      onReturn(parseQuery(navUrl));
      return false; // don't actually load the callback page
    }
    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Secure Payment</Text>
        <View style={{ width: 56 }} />
      </View>
      {visible && !!url && (
        <WebView
          source={{ uri: url }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          onShouldStartLoadWithRequest={(req) => intercept(req.url)}
          onNavigationStateChange={(s) => intercept(s.url)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          )}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cancel: { color: theme.danger, fontSize: 15, fontWeight: '600', width: 56 },
  title: { fontSize: 16, fontWeight: '700', color: theme.text },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
