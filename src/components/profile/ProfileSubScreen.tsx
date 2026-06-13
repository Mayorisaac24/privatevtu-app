import { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { ThemedScreen } from '../ui/ThemedScreen';
import { navigateBack } from '../../lib/navigation';
import { useStatusBarStyle } from '../../hooks/useStatusBarStyle';
import { isAndroid, useLayout } from '../../lib/platform-ui';
import { AppText } from '../ui/AppText';
import { ScreenContent } from '../ui/ScreenContent';

type ProfileSubScreenProps = {
  title: string;
  subtitle?: string;
  headerAccessory?: ReactNode;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  footer?: ReactNode;
};

export function ProfileSubScreen({
  title,
  subtitle,
  headerAccessory,
  headerIcon,
  children,
  footer,
}: ProfileSubScreenProps) {
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const { pagePadding } = useLayout();
  const gradients = useGradients();

  return (
    <ThemedScreen>
      <LinearGradient
        colors={[...gradients.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10, paddingHorizontal: pagePadding }]}
      >
        <View style={styles.headerBlobPrimary} />
        <View style={styles.headerBlobSecondary} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <AppText weight="800" style={styles.headerTitle}>{title}</AppText>
            {subtitle ? <AppText style={styles.headerSub}>{subtitle}</AppText> : null}
            {headerAccessory}
          </View>
          {headerIcon ? (
            <View style={styles.headerIconWrap}>
              <Ionicons name={headerIcon} size={22} color={Colors.white} />
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.curve} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: pagePadding,
              paddingBottom: insets.bottom + (footer ? (isAndroid ? 112 : 100) : (isAndroid ? 28 : 24)),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenContent centered>{children}</ScreenContent>
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingHorizontal: pagePadding, paddingBottom: insets.bottom + 12 }]}>
            <ScreenContent centered>{footer}</ScreenContent>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingBottom: isAndroid ? 18 : 22, overflow: 'hidden' },
  headerBlobPrimary: {
    position: 'absolute',
    top: -36,
    right: -18,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(124, 58, 237, 0.28)',
  },
  headerBlobSecondary: {
    position: 'absolute',
    bottom: -42,
    left: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 3 },
  headerTitle: { ...Typography.h3, fontSize: 20, color: Colors.white, letterSpacing: -0.3 },
  headerSub: { ...Typography.small, color: 'rgba(255,255,255,0.72)' },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curve: {
    height: 20,
    marginTop: -20,
    backgroundColor: Colors.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scroll: { paddingTop: 8, gap: 14 },
  footer: {
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
});
