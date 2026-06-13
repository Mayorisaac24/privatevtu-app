import { ReactNode, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCard } from '../ui/AuthCard';
import { AppLogo } from '../ui/AppLogo';
import { Colors, Spacing } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { ThemedScreen } from '../ui/ThemedScreen';
import { isAndroid, platformSpacing } from '../../lib/platform-ui';

type AuthShellProps = {
  children: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
  heroTagline?: string;
  showLogo?: boolean;
  showBrandInline?: boolean;
  heroIcon?: ReactNode;
  onBack?: () => void;
  /** Enable inner scroll so forms stay visible above the keyboard. Default on for auth forms. */
  scrollable?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
  cardContentStyle?: StyleProp<ViewStyle>;
  cardFooter?: ReactNode;
};

type LogoSize = 'xs' | 'sm' | 'md';

const LOGO_DIMS: Record<LogoSize, number> = {
  xs: 72,
  sm: 108,
  md: 132,
};

export function AuthHeroLogo({ size = 'md' }: { size?: LogoSize }) {
  return <AppLogo size={LOGO_DIMS[size]} />;
}

export function AuthHeroIcon({
  icon,
  size = 52,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
}) {
  const gradients = useGradients();

  return (
    <View style={[styles.iconGlow, { width: size + 10, height: size + 10, borderRadius: (size + 10) * 0.32 }]}>
      <LinearGradient
        colors={[...gradients.logo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={size * 0.42} color={Colors.white} />
      </LinearGradient>
    </View>
  );
}

export function AuthSecurityFooter() {
  return (
    <View style={styles.securityFooter}>
      <Ionicons name="lock-closed" size={11} color={Colors.mutedLight} />
      <Text style={styles.securityText}>Encrypted sign-in · Instant VTU delivery</Text>
    </View>
  );
}

export function AuthMethodPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.methodPill}>
      <Ionicons name={icon} size={14} color={Colors.primary} />
      <Text style={styles.methodPillText}>{label}</Text>
    </View>
  );
}

function AuthBrandedHero({
  tagline,
  heroIcon,
  heroTitle,
  heroSubtitle,
  showLogo,
  showBrandInline,
  compact,
}: {
  tagline?: string;
  heroIcon?: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
  showLogo?: boolean;
  showBrandInline?: boolean;
  compact?: boolean;
}) {
  if (heroIcon) {
    return (
      <View style={[styles.iconHero, compact && styles.iconHeroCompact]}>
        {!compact ? heroIcon : null}
        {heroTitle && !compact ? <Text style={styles.heroTitle}>{heroTitle}</Text> : null}
        {heroSubtitle && !compact ? (
          <Text style={styles.heroSubtitle} numberOfLines={2}>{heroSubtitle}</Text>
        ) : null}
      </View>
    );
  }

  if (compact && showLogo) {
    return (
      <View style={styles.compactBrandRow}>
        <AuthHeroLogo size="xs" />
      </View>
    );
  }

  return (
    <View style={styles.brandedHero}>
      {showLogo ? (
        <>
          <View style={styles.brandLockup}>
            <AuthHeroLogo size={showBrandInline ? 'sm' : 'md'} />
            {showBrandInline ? (
              <View style={styles.brandTextCol}>
                <Text style={styles.brandTagline}>
                  {tagline || 'Your trusted VTU platform'}
                </Text>
              </View>
            ) : null}
          </View>

          <LinearGradient
            colors={['rgba(167,139,250,0.55)', 'rgba(124,58,237,0.35)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.brandAccent}
          />

          <View style={styles.trustMicro}>
            <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.trustMicroText}>Secure · Encrypted · Always on</Text>
          </View>
        </>
      ) : null}

      {heroTitle ? <Text style={styles.heroTitle}>{heroTitle}</Text> : null}
      {heroSubtitle ? (
        <Text style={styles.heroSubtitle} numberOfLines={2}>{heroSubtitle}</Text>
      ) : null}
    </View>
  );
}

function AuthHeroSection({
  insetsTop,
  onBack,
  heroTagline,
  heroIcon,
  heroTitle,
  heroSubtitle,
  showLogo,
  showBrandInline,
  compact,
}: {
  insetsTop: number;
  onBack?: () => void;
  heroTagline?: string;
  heroIcon?: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
  showLogo?: boolean;
  showBrandInline?: boolean;
  compact?: boolean;
}) {
  const gradients = useGradients();

  return (
    <LinearGradient
      colors={[...gradients.heroAuth]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.hero,
        {
          paddingTop: insetsTop + (compact ? 6 : 10),
          paddingBottom: compact ? 10 : 22,
        },
      ]}
    >
      {!compact ? <View style={styles.heroMeshPrimary} /> : null}
      {!compact ? <View style={styles.heroMeshSecondary} /> : null}
      {!compact ? <View style={styles.heroMeshAccent} /> : null}

      {onBack ? (
        <TouchableOpacity
          style={[styles.backBtn, compact && styles.backBtnCompact]}
          onPress={onBack}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.backBtnInner}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
          </View>
        </TouchableOpacity>
      ) : null}

      <AuthBrandedHero
        tagline={heroTagline}
        heroIcon={heroIcon}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        showLogo={showLogo}
        showBrandInline={showBrandInline}
        compact={compact}
      />

      <View style={[styles.heroFade, compact && styles.heroFadeCompact]} />
    </LinearGradient>
  );
}

export function AuthShell({
  children,
  heroTitle,
  heroSubtitle,
  heroTagline,
  showLogo = true,
  showBrandInline = true,
  heroIcon,
  onBack,
  scrollable = false,
  cardStyle,
  cardContentStyle,
  cardFooter,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <ThemedScreen withAmbient={false}>
      <View pointerEvents="box-none" style={styles.heroWrap}>
        <AuthHeroSection
          insetsTop={insets.top}
          onBack={onBack}
          heroTagline={heroTagline}
          heroIcon={heroIcon}
          heroTitle={heroTitle}
          heroSubtitle={heroSubtitle}
          showLogo={showLogo}
          showBrandInline={showBrandInline}
          compact={keyboardVisible}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <AuthCard
          scrollable={scrollable}
          fill
          scrollBottomInset={insets.bottom + (isAndroid ? 44 : 32)}
          style={[styles.card, cardStyle]}
          contentStyle={cardContentStyle}
          footer={cardFooter}
        >
          {children}
        </AuthCard>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

export function AuthCardHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.cardHeader}>
      {eyebrow ? <Text style={styles.cardEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    marginTop: isAndroid ? -18 : -14,
    zIndex: 1,
  },
  heroWrap: {
    zIndex: 0,
  },
  hero: {
    paddingBottom: isAndroid ? 18 : 22,
    paddingHorizontal: Spacing.page,
    overflow: 'hidden',
    position: 'relative',
  },
  heroMeshPrimary: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  heroMeshSecondary: {
    position: 'absolute',
    top: 40,
    left: -50,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
  },
  heroMeshAccent: {
    position: 'absolute',
    bottom: 20,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandedHero: {
    gap: 12,
    paddingTop: 4,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandTextCol: {
    flex: 1,
    gap: 4,
  },
  logoGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  logoRing: {
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  logoLetter: {
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
  },
  iconGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.58)',
    lineHeight: 17,
  },
  brandAccent: {
    height: 2,
    width: '72%',
    borderRadius: 1,
    marginTop: 2,
  },
  trustMicro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  trustMicroText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.48)',
    letterSpacing: 0.25,
  },
  iconHero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  iconHeroCompact: {
    paddingTop: 0,
    minHeight: 0,
  },
  compactBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  compactBrandName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  backBtnCompact: {
    marginBottom: 8,
  },
  heroFadeCompact: {
    height: 12,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: -0.1,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  card: {
    marginTop: 0,
  },
  cardHeader: {
    marginBottom: platformSpacing(26, -4),
    gap: 5,
  },
  cardEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.2,
    marginBottom: 2,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  cardTitle: {
    fontSize: isAndroid ? 25 : 26,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.6,
    lineHeight: isAndroid ? 30 : 32,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 21,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: isAndroid ? 22 : 28,
    paddingTop: isAndroid ? 16 : 20,
    paddingBottom: isAndroid ? 8 : 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.mutedLight,
    letterSpacing: 0.15,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.14)',
    marginBottom: 20,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
