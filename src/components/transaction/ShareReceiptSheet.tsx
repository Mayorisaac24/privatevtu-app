import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EnrichedTransaction } from '../../lib/transaction-display';
import { buildTransactionReceiptData, type TransactionReceiptData } from '../../lib/transaction-receipt';
import { receiptThemeFromApp } from '../../lib/receipt-html';
import { isViewShotNativeAvailable, shareReceiptAsImageOrPdfFallback } from '../../lib/share-transaction-receipt';
import type { SupportConfig } from '../../lib/support';
import { api, isResponseSuccess } from '../../lib/api';
import { useColors, useGradients } from '../../theme/hooks';
import { Radius, Spacing, Typography } from '../../theme';
import { showToast } from '../ui/Toast';
import { TransactionReceiptCard } from './TransactionReceiptCard';

type ShareReceiptSheetProps = {
  visible: boolean;
  transaction: EnrichedTransaction | null;
  onClose: () => void;
};

type ShareFormat = 'image' | 'pdf';

export function ShareReceiptSheet({ visible, transaction, onClose }: ShareReceiptSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const gradients = useGradients();
  const captureRef = useRef<View>(null);
  const [sharing, setSharing] = useState<ShareFormat | null>(null);
  const [supportConfig, setSupportConfig] = useState<Pick<SupportConfig, 'appName' | 'supportEmail'> | null>(null);
  const [resolvedReceipt, setResolvedReceipt] = useState<TransactionReceiptData | null>(null);

  const loadSupportConfig = useCallback(async () => {
    if (supportConfig) return supportConfig;
    try {
      const res = await api.getSupportConfig();
      if (isResponseSuccess(res) && res.data) {
        const next = { appName: res.data.appName, supportEmail: res.data.supportEmail };
        setSupportConfig(next);
        return next;
      }
    } catch {
      // fall through to defaults
    }
    return null;
  }, [supportConfig]);

  useEffect(() => {
    if (!visible || !transaction) {
      setResolvedReceipt(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const config = await loadSupportConfig();
      if (!cancelled) {
        setResolvedReceipt(buildTransactionReceiptData(transaction, config));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, transaction, loadSupportConfig]);

  const receiptTheme = receiptThemeFromApp(colors, gradients);

  const waitForReceiptLayout = () => new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  const handleShare = async (format: ShareFormat) => {
    if (!transaction) return;

    setSharing(format);
    try {
      const config = await loadSupportConfig();
      const data = buildTransactionReceiptData(transaction, config);
      setResolvedReceipt(data);

      if (format === 'pdf') {
        const { shareReceiptAsPdf } = await import('../../lib/share-transaction-receipt');
        await shareReceiptAsPdf(data, receiptTheme);
      } else {
        await waitForReceiptLayout();
        const sharedAs = await shareReceiptAsImageOrPdfFallback(captureRef, data, receiptTheme);
        if (sharedAs === 'pdf') {
          showToast({
            type: 'info',
            text1: 'Shared as PDF',
            text2: 'Image sharing needs an app rebuild. PDF was sent instead.',
          });
        }
      }
      onClose();
    } catch (error) {
      console.error(error);
      showToast({
        type: 'error',
        text1: 'Could not share receipt',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setSharing(null);
    }
  };

  if (!visible || !transaction) return null;

  const receiptReady = Boolean(resolvedReceipt);
  const imageShareReady = isViewShotNativeAvailable();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => { void loadSupportConfig(); }}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.dark }]}>Share receipt</Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Choose how you want to send your transaction receipt.
        </Text>

        <ScrollView
          style={styles.previewScroll}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          {receiptReady && resolvedReceipt ? (
            <TransactionReceiptCard data={resolvedReceipt} theme={receiptTheme} compact />
          ) : (
            <View style={styles.previewLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.previewLoadingText, { color: colors.muted }]}>Preparing receipt…</Text>
            </View>
          )}
        </ScrollView>

        {receiptReady && resolvedReceipt ? (
          <View
            ref={captureRef}
            collapsable={false}
            pointerEvents="none"
            style={styles.captureHost}
          >
            <TransactionReceiptCard data={resolvedReceipt} theme={receiptTheme} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.85}
            disabled={sharing !== null || !receiptReady}
            onPress={() => void handleShare('image')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryMuted }]}>
              {sharing === 'image' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="image-outline" size={22} color={colors.primary} />
              )}
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: colors.dark }]}>Share as image</Text>
              <Text style={[styles.actionSub, { color: colors.muted }]}>
                {imageShareReady
                  ? 'PNG receipt for WhatsApp, Messages, and social apps'
                  : 'Unavailable until app rebuild — will share PDF instead'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.85}
            disabled={sharing !== null || !receiptReady}
            onPress={() => void handleShare('pdf')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryMuted }]}>
              {sharing === 'pdf' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              )}
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: colors.dark }]}>Share as PDF</Text>
              <Text style={[styles.actionSub, { color: colors.muted }]}>
                Printable document for email and formal records
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.page,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    ...Typography.h3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...Typography.small,
    marginBottom: 14,
    lineHeight: 18,
  },
  previewScroll: {
    maxHeight: 360,
    marginBottom: 14,
  },
  previewContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 220,
    justifyContent: 'center',
  },
  captureHost: {
    position: 'absolute',
    top: -2000,
    left: 0,
    width: 360,
    opacity: 1,
  },
  previewLoading: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});
