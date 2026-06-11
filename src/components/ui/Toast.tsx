import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const SOLID_BANNER_THEMES = {
  error: {
    background: '#DC2626',
    icon: 'alert-circle' as const,
  },
  success: {
    background: '#059669',
    icon: 'checkmark-circle' as const,
  },
};

const CARD_VARIANTS: Record<
  Extract<ToastVariant, 'warning' | 'info'>,
  {
    icon: keyof typeof Ionicons.glyphMap;
    background: string;
    accent: string;
    iconBg: string;
    border: string;
    title: string;
    body: string;
  }
> = {
  warning: {
    icon: 'warning-outline',
    background: '#FFFBEB',
    accent: '#D97706',
    iconBg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.2)',
    title: '#92400E',
    body: '#B45309',
  },
  info: {
    icon: 'information-circle-outline',
    background: '#F5F3FF',
    accent: Colors.primary,
    iconBg: 'rgba(124, 58, 237, 0.12)',
    border: 'rgba(124, 58, 237, 0.2)',
    title: '#4C1D95',
    body: '#6D28D9',
  },
};

function SolidTopBanner({
  variant,
  text1,
  text2,
}: {
  variant: 'error' | 'success';
  text1?: string;
  text2?: string;
}) {
  const insets = useSafeAreaInsets();
  const theme = SOLID_BANNER_THEMES[variant];

  return (
    <View style={[styles.solidBanner, { backgroundColor: theme.background }]}>
      <View style={[styles.solidContent, { paddingTop: insets.top + 12 }]}>
        <View style={styles.solidIconWrap}>
          <Ionicons name={theme.icon} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          {text1 ? (
            <Text style={styles.solidTitle} numberOfLines={2}>
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text style={styles.solidBody} numberOfLines={3}>
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ToastCard({
  variant,
  text1,
  text2,
}: {
  variant: Extract<ToastVariant, 'warning' | 'info'>;
  text1?: string;
  text2?: string;
}) {
  const insets = useSafeAreaInsets();
  const theme = CARD_VARIANTS[variant];

  return (
    <View style={[styles.toastOuter, { paddingTop: insets.top + 8 }]}>
      <View
        style={[
          styles.toast,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: theme.accent }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={theme.icon} size={20} color={theme.accent} />
        </View>
        <View style={styles.textWrap}>
          {text1 ? (
            <Text style={[styles.title, { color: theme.title }]} numberOfLines={2}>
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text style={[styles.body, { color: theme.body }]} numberOfLines={3}>
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <SolidTopBanner variant="success" text1={text1} text2={text2} />
  ),
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <SolidTopBanner variant="error" text1={text1} text2={text2} />
  ),
  warning: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastCard variant="warning" text1={text1} text2={text2} />
  ),
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastCard variant="info" text1={text1} text2={text2} />
  ),
};

const styles = StyleSheet.create({
  solidBanner: {
    width: '100%',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  solidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  solidIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  solidTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  solidBody: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  toastOuter: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 0,
    gap: 10,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingVertical: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
});

export default function ToastProvider(props: React.ComponentProps<typeof Toast>) {
  return <Toast {...props} config={toastConfig} topOffset={0} />;
}

/** Hide any visible toast before showing the next one to avoid width/height flicker. */
export function showToast(options: Parameters<typeof Toast.show>[0]) {
  Toast.hide();
  Toast.show(options);
}

export { Toast };
