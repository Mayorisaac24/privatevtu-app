import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, getToastVariantPalette, useColors } from '../../theme';
import type { ToastVariant } from '../../theme';
import { GlassSurface } from './GlassSurface';

const TOAST_ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const TOAST_GLASS: Record<ToastVariant, 'light' | 'tinted'> = {
  success: 'light',
  error: 'light',
  warning: 'light',
  info: 'tinted',
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
  const colors = useColors();
  const theme = getToastVariantPalette(variant, colors);
  const icon = TOAST_ICONS[variant];
  const glass = TOAST_GLASS[variant];

  return (
    <View style={[styles.outer, { paddingTop: insets.top + 10 }]}>
      <GlassSurface
        variant={glass}
        borderRadius={Radius.lg}
        intensity={68}
        style={[styles.shell, { shadowColor: colors.primaryDeep }]}
        contentStyle={[styles.content, { backgroundColor: theme.tintBg }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}18` }]}>
          <Ionicons name={icon} size={20} color={theme.accent} />
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
