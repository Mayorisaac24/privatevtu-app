import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import type { PayvesselCheckoutSdkSession } from '../lib/api';
import {
  PAYVESSEL_CHECKOUT_USER_ERROR,
  sanitizePayvesselCheckoutError,
} from '../lib/payvessel-checkout-errors';
import {Colors , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../theme';
import { GlassSurface } from './ui/GlassSurface';

const CHECKOUT_URL = 'https://checkout.payvessel.com';

type TransactionData = {
  id: string;
  reference: string;
  access_code: string;
};

type Props = {
  session: PayvesselCheckoutSdkSession | null;
  visible: boolean;
  onInitialized?: (merchantReference: string, providerReference: string) => void;
  onSuccess: (merchantReference: string) => void;
  onClose: () => void;
  onError?: (message: string) => void;
  /** Fired while checkout session is being prepared. */
  onPreparing?: () => void;
  /** Fired when checkout WebView is ready — dismiss external loading overlay. */
  onPrepared?: () => void;
};

function getApiBaseUrl(apiKey: string): string {
  if (apiKey.startsWith('PVTESTKEY-')) {
    return 'https://sandbox.payvessel.com';
  }
  return 'https://api.payvessel.com';
}

const INJECTED_JAVASCRIPT = `
  (function() {
    const originalPostMessage = window.parent.postMessage;
    window.parent.postMessage = function(message, targetOrigin) {
      if (window.ReactNativeWebView) {
        try {
          const data = typeof message === 'string' ? JSON.parse(message) : message;
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'message', payload: message }));
        }
      }
      return originalPostMessage.call(window.parent, message, targetOrigin);
    };
    window.addEventListener('message', function(event) {
      if (window.ReactNativeWebView) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        } catch (e) {}
      }
    });
    true;
  })();
`;

export function PayvesselCheckoutModal({
  session,
  visible,
  onInitialized,
  onSuccess,
  onClose,
  onError,
  onPreparing,
  onPrepared,
}: Props) {
  const styles = useStyles();

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const failCheckout = useCallback((rawMessage?: string) => {
    const userMessage = sanitizePayvesselCheckoutError(rawMessage);
    setHasError(true);
    setIsLoading(false);
    onError?.(userMessage);
  }, [onError]);

  const initializeTransaction = useCallback(async () => {
    if (!session) return;

    if (!session.apiKey || !session.customerEmail || !session.customerName || !session.amount) {
      failCheckout('Missing checkout session fields');
      return;
    }

    onPreparing?.();
    setHasError(false);
    setCheckoutUrl(null);
    try {
      const payload: Record<string, unknown> = {
        amount: String(session.amount),
        currency: session.currency,
        customer_email: session.customerEmail,
        customer_name: session.customerName,
        customer_phone_number: session.customerPhoneNumber,
        channels: session.channels,
        metadata: session.metadata,
        reference: session.reference,
      };

      const response = await fetch(`${getApiBaseUrl(session.apiKey)}/pms/checkout/initialize/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': session.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const rawMessage = typeof result?.message === 'string' ? result.message : JSON.stringify(result);

      if (!response.ok || result?.success === false || !result?.data?.access_code) {
        failCheckout(rawMessage);
        return;
      }

      const data = result.data as TransactionData;
      onInitialized?.(session.reference, String(data.reference || data.id));
      setCheckoutUrl(`${CHECKOUT_URL}/${data.access_code}`);
    } catch (err) {
      failCheckout(err instanceof Error ? err.message : 'Initialize failed');
    }
  }, [session, failCheckout, onInitialized, onPreparing]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { event?: string };
      switch (data.event) {
        case 'payment_success':
          if (session) onSuccess(session.reference);
          break;
        case 'payment_failed':
          failCheckout('Payment failed in checkout WebView');
          break;
        case 'payment_closed':
        case 'checkout_closed':
          onClose();
          break;
        default:
          break;
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [session, onSuccess, onClose, failCheckout]);

  useEffect(() => {
    if (visible && session) {
      setIsLoading(true);
      setHasError(false);
      setCheckoutUrl(null);
      void initializeTransaction();
    }
  }, [visible, session?.reference, initializeTransaction]);

  useEffect(() => {
    if (checkoutUrl && !isLoading && !hasError) {
      onPrepared?.();
    }
  }, [checkoutUrl, isLoading, hasError, onPrepared]);

  useEffect(() => {
    if (hasError) onPrepared?.();
  }, [hasError, onPrepared]);

  if (!session || !visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <GlassSurface variant="light" borderRadius={0} style={styles.headerShell} contentStyle={styles.header}>
          <Text style={styles.headerTitle}>Fund Wallet</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={Colors.muted} />
          </TouchableOpacity>
        </GlassSurface>

        <View style={styles.body}>
          {checkoutUrl && !hasError && (
            <WebView
              ref={webViewRef}
              source={{ uri: checkoutUrl }}
              style={styles.webview}
              onMessage={handleMessage}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => failCheckout('WebView load error')}
              injectedJavaScript={INJECTED_JAVASCRIPT}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              originWhitelist={['*']}
            />
          )}

          {hasError && (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.warning} />
              <Text style={styles.errorTitle}>Checkout unavailable</Text>
              <Text style={styles.errorMessage}>{PAYVESSEL_CHECKOUT_USER_ERROR}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void initializeTransaction()}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  headerShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: colors.card },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginTop: 4 },
  errorMessage: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  closeBtn: { paddingVertical: 10 },
  closeText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
