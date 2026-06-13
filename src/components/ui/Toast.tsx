import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { GlassSurface } from './GlassSurface';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANTS: Record<
  ToastVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    glass: 'light' | 'tinted';
    tintBg: string;
    accent: string;
    title: string;
    body: string;
  }
> = {
  success: {
    icon: 'checkmark-circle',
    glass: 'light',
    tintBg: 'rgba(236, 253, 245, 0.72)',
    accent: '#059669',
    title: '#065F46',
    body: '#047857',
  },
  error: {
    icon: 'close-circle',
    glass: 'light',
    tintBg: 'rgba(254, 242, 242, 0.78)',
    accent: '#DC2626',
    title: '#991B1B',
    body: '#B91C1C',
  },
  warning: {
    icon: 'warning',
    glass: 'light',
    tintBg: 'rgba(255, 251, 235, 0.78)',
    accent: '#D97706',
    title: '#92400E',
    body: '#B45309',
  },
  info: {
    icon: 'information-circle',
    glass: 'tinted',
    tintBg: 'rgba(245, 243, 255, 0.78)',
    accent: Colors.primary,
    title: '#4C1D95',
    body: '#6D28D9',
  },
};

function GlassToast({
  variant,
  text1,
  text2,
}: {
  variant: ToastVariant;
  text1?: string;
  text2?: string;
}) {
  const insets = useSafeAreaInsets();
  const theme = VARIANTS[variant];

  return (
    <View style={[styles.outer, { paddingTop: insets.top + 10 }]}>
      <GlassSurface
        variant={theme.glass}
        borderRadius={Radius.lg}
        intensity={68}
        style={styles.shell}
        contentStyle={[styles.content, { backgroundColor: theme.tintBg }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}18` }]}>
          <Ionicons name={theme.icon} size={20} color={theme.accent} />
        </View>
        <View style={styles.textWrap}>
          {text1 ? (
            <Text
              style={[
                text2 ? styles.title : styles.message,
                { color: text2 ? theme.title : theme.body },
              ]}
              numberOfLines={2}
            >
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text style={[styles.body, { color: theme.body }]} numberOfLines={3}>
              {text2}
            </Text>
          ) : null}
        </View>
      </GlassSurface>
    </View>
  );
}

const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <GlassToast variant="success" text1={text1} text2={text2} />
  ),
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <GlassToast variant="error" text1={text1} text2={text2} />
  ),
  warning: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <GlassToast variant="warning" text1={text1} text2={text2} />
  ),
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <GlassToast variant="info" text1={text1} text2={text2} />
  ),
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  shell: {
    width: '100%',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingVertical: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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

export type ShowToastOptions = {
  type: ToastVariant;
  text1?: string;
  text2?: string;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
};

/** Single entry point for all in-app toasts. */
export function showToast(options: ShowToastOptions) {
  Toast.hide();
  Toast.show({
    ...options,
    visibilityTime: options.visibilityTime ?? 2800,
  });
}
