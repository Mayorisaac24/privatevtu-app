import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCard } from '../ui/AuthCard';
import { AppLogo } from '../ui/AppLogo';
import { KeyboardDismissView } from '../ui/KeyboardDismissView';
import {Colors, Spacing , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { ThemedScreen } from '../ui/ThemedScreen';
import { useKeyboardInsets } from '../../hooks/useKeyboardInsets';
import { isAndroid, platformSpacing, useLayout } from '../../lib/platform-ui';
import { POWERED_BY_LABEL } from '../../constants/brand';

const APP_ICON = require('../../../assets/icon.png');

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

/** Auth hero logo sizes — inline (xs) sits beside the tagline on sign-in/register. */
const LOGO_DIMS: Record<LogoSize, number> = {
  xs: 60,
  sm: 76,
  md: 96,
};

function resolveAuthHeroLogoPx(
  size: LogoSize,
  width: number,
  isTablet: boolean,
): number {
  const base = LOGO_DIMS[size];
  if (size === 'xs') {
    if (width < 360) return 54;
    if (isTablet) return 64;
    return base;
  }
  if (isTablet) return base + 6;
  return base;
}

export function AuthHeroLogo({ size = 'md' }: { size?: LogoSize }) {
  const styles = useStyles();

  const { width, isTablet } = useLayout();
  const px = resolveAuthHeroLogoPx(size, width, isTablet);
  return <AppLogo size={px} />;
}

function AuthHeroBrandMark({ compact }: { compact?: boolean }) {
  const styles = useStyles();

  const iconSize = compact ? 36 : 44;
  return (
    <View style={styles.authBrandMark}>
      <View style={[styles.authBrandIconWrap, { width: iconSize + 8, height: iconSize + 8, borderRadius: (iconSize + 8) * 0.24 }]}>
        <Image
          source={APP_ICON}
          style={{ width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }}
          resizeMode="contain"
          accessibilityLabel="Datamart"
        />
      </View>
      <View style={styles.authBrandTextCol}>
        <Text style={[styles.authBrandName, compact && styles.authBrandNameCompact]}>Datamart</Text>
        <Text style={styles.authBrandTagline}>Your trusted VTU platform</Text>
      </View>
    </View>
  );
}

export function AuthHeroIcon({
  icon,
  size = 52,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
}) {
  const styles = useStyles();

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
  const styles = useStyles();

  return (
    <View style={styles.securityFooter}>
      <View style={styles.securityRow}>
        <Ionicons name="lock-closed" size={11} color={Colors.mutedLight} />
        <Text style={styles.securityText}>Encrypted sign-in · Instant VTU delivery</Text>
      </View>
      <Text style={styles.poweredByText}>{POWERED_BY_LABEL}</Text>
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
  const styles = useStyles();

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
  const styles = useStyles();

  if (heroIcon) {
    return (
      <View style={[styles.iconHero, compact && styles.iconHeroCompact]}>
        {!compact ? heroIcon : null}
        {heroTitle && !compact ? (
          <Text style={styles.iconHeroTitle} numberOfLines={2}>{heroTitle}</Text>
        ) : null}
        {heroSubtitle && !compact ? (
          <Text style={styles.heroSubtitle} numberOfLines={2}>{heroSubtitle}</Text>
        ) : null}
      </View>
    );
  }

  if (compact && showLogo) {
    return (
      <View style={styles.compactBrandRow}>
        <AuthHeroBrandMark compact />
      </View>
    );
  }

  return (
    <View style={styles.brandedHero}>
      {showLogo ? (
        <>
          <AuthHeroBrandMark compact={showBrandInline} />

          <View style={styles.trustMicro}>
            <Ionicons name="shield-checkmark" size={12} color={Overlays.white55} />
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
  heroTagline,
  heroIcon,
  heroTitle,
  heroSubtitle,
  showLogo,
  showBrandInline,
  compact,
}: {
  insetsTop: number;
  heroTagline?: string;
  heroIcon?: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
  showLogo?: boolean;
  showBrandInline?: boolean;
  compact?: boolean;
}) {
  const styles = useStyles();

  const gradients = useGradients();
  const iconHeroMode = Boolean(heroIcon) && !showLogo;

  return (
    <LinearGradient
      colors={[...gradients.heroAuth]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.hero,
        iconHeroMode && styles.heroIconMode,
        {
          paddingTop: insetsTop + (compact ? 6 : iconHeroMode ? 6 : 8),
          paddingBottom: compact
            ? 10
            : iconHeroMode
              ? (isAndroid ? 36 : 40)
              : (isAndroid ? 20 : 22),
        },
      ]}
    >
      {!compact ? <View style={styles.heroMeshPrimary} /> : null}
      {!compact ? <View style={styles.heroMeshSecondary} /> : null}
      {!compact ? <View style={styles.heroMeshAccent} /> : null}

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
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();
  const scrollBottomInset = insets.bottom + (keyboardVisible ? 24 : (isAndroid ? 44 : 32));

  return (
    <ThemedScreen withAmbient={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <KeyboardDismissView style={styles.flex}>
          <View style={styles.heroWrap} pointerEvents="box-none">
            <AuthHeroSection
              insetsTop={insets.top}
              heroTagline={heroTagline}
              heroIcon={heroIcon}
              heroTitle={heroTitle}
              heroSubtitle={heroSubtitle}
              showLogo={showLogo}
              showBrandInline={showBrandInline}
              compact={keyboardVisible}
            />
          </View>

          <View
            style={[
              styles.body,
              heroIcon && !showLogo ? styles.bodyIconHero : null,
            ]}
          >
            <AuthCard
              scrollable={scrollable}
              fill={!keyboardVisible}
              scrollBottomInset={scrollBottomInset}
              keyboardPadding={keyboardVisible ? keyboardHeight : 0}
              style={[styles.card, cardStyle]}
              contentStyle={cardContentStyle}
              footer={cardFooter}
            >
              {children}
            </AuthCard>
          </View>
        </KeyboardDismissView>

        {onBack ? (
          <TouchableOpacity
            style={[styles.floatingBackBtn, { top: insets.top + 6 }]}
            onPress={() => {
              onBack();
            }}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color={Colors.white} />
            </View>
          </TouchableOpacity>
        ) : null}
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
  const styles = useStyles();

  return (
    <View style={styles.cardHeader}>
      {eyebrow ? <Text style={styles.cardEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    marginTop: isAndroid ? -18 : -14,
    minHeight: 0,
    zIndex: 1,
  },
  bodyIconHero: {
    marginTop: isAndroid ? -6 : -4,
  },
  heroWrap: {
    zIndex: 0,
  },
  floatingBackBtn: {
    position: 'absolute',
    left: Spacing.page,
    zIndex: 999,
    elevation: 999,
  },
  hero: {
    paddingHorizontal: Spacing.page,
    overflow: 'hidden',
    position: 'relative',
  },
  heroIconMode: {
    minHeight: isAndroid ? 168 : 176,
    justifyContent: 'flex-end',
  },
  heroMeshPrimary: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Overlays.violet20,
  },
  heroMeshSecondary: {
    position: 'absolute',
    top: 40,
    left: -50,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Overlays.indigo14,
  },
  heroMeshAccent: {
    position: 'absolute',
    bottom: 20,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Overlays.white03,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.white07,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: Overlays.white06,
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
    backgroundColor: Overlays.white10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.white16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandedHero: {
    gap: 10,
    paddingTop: 2,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authBrandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authBrandIconWrap: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  authBrandTextCol: {
    flex: 1,
    gap: 2,
  },
  authBrandName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  authBrandNameCompact: {
    fontSize: 18,
  },
  authBrandTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: Overlays.white72,
    lineHeight: 16,
  },
  brandTextCol: {
    flex: 1,
    gap: 2,
  },
  logoGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlays.violet18,
  },
  logoRing: {
    padding: 2,
    backgroundColor: Overlays.white14,
  },
  logoLetter: {
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.8,
  },
  iconGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlays.violet20,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Overlays.rgba255_255_255_056,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  brandAccent: {
    height: 1.5,
    width: '58%',
    borderRadius: 1,
    marginTop: 0,
  },
  trustMicro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 0,
  },
  trustMicroText: {
    fontSize: 10,
    fontWeight: '500',
    color: Overlays.rgba255_255_255_044,
    letterSpacing: 0.2,
  },
  iconHero: {
    alignItems: 'center',
    gap: 12,
    paddingTop: isAndroid ? 4 : 8,
    paddingBottom: isAndroid ? 8 : 12,
  },
  iconHeroCompact: {
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 0,
  },
  iconHeroTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Overlays.white90,
    letterSpacing: -0.1,
    textAlign: 'center',
    ...(isAndroid ? { includeFontPadding: false } : null),
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
    color: colors.white,
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
    color: Overlays.white88,
    letterSpacing: -0.1,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Overlays.white62,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  card: {
    marginTop: 0,
  },
  cardHeader: {
    marginBottom: platformSpacing(26, -8),
    gap: platformSpacing(5, 3),
  },
  cardEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
    marginBottom: 2,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  cardTitle: {
    fontSize: isAndroid ? 25 : 26,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: -0.6,
    lineHeight: isAndroid ? 30 : 32,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  securityFooter: {
    alignItems: 'center',
    gap: 4,
    marginTop: isAndroid ? 22 : 28,
    paddingTop: isAndroid ? 16 : 20,
    paddingBottom: isAndroid ? 8 : 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedLight,
    letterSpacing: 0.15,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  poweredByText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.mutedLight,
    opacity: 0.85,
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
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: Overlays.borderPrimary14,
    marginBottom: 20,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
