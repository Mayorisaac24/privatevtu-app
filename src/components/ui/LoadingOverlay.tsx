import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {Colors, Radius , Overlays, useThemedStyles, useGradients } from '../../theme';
import { gradientStops } from '../../theme/gradient-utils';
import { GlassSurface } from './GlassSurface';

type LoadingOverlayProps = {
  visible: boolean;
  message?: string;
  submessage?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  /** Renders inside the current view tree instead of a separate Modal (use inside TransactionLockSheet). */
  embedded?: boolean;
};

function BounceDot({ delay }: { delay: number }) {
  const styles = useStyles();

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 360,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(240),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ translateY }],
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
        },
      ]}
    />
  );
}

function LoadingOverlayContent({
  message,
  submessage,
  icon,
  style,
  pulse,
  spin,
}: {
  message: string;
  submessage?: string;
  icon: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  pulse: Animated.Value;
  spin: Animated.Value;
}) {
  const styles = useStyles();
  const gradients = useGradients();

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.65],
  });

  const ringRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.backdrop, style]}>
      <BlurView
        intensity={40}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={styles.backdropTint} />

      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <GlassSurface
        variant="light"
        borderRadius={Radius.xl}
        intensity={72}
        style={styles.card}
        contentStyle={styles.cardContent}
      >
        <View style={styles.iconStage}>
          <Animated.View style={[styles.orbitRing, { transform: [{ rotate: ringRotate }] }]}>
            <View style={styles.orbitDot} />
          </Animated.View>

          <LinearGradient
            colors={gradientStops(gradients.cardSoft)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name={icon} size={26} color={Colors.white} />
          </LinearGradient>
        </View>

        <Text style={styles.message}>{message}</Text>
        {submessage ? <Text style={styles.submessage}>{submessage}</Text> : null}

        <View style={styles.dotsRow}>
          <BounceDot delay={0} />
          <BounceDot delay={120} />
          <BounceDot delay={240} />
        </View>
      </GlassSurface>
    </View>
  );
}

export function LoadingOverlay({
  visible,
  message = 'Please wait…',
  submessage,
  icon = 'sparkles',
  style,
  embedded = false,
}: LoadingOverlayProps) {
  const styles = useStyles();

  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin, visible]);

  if (!visible) return null;

  const content = (
    <LoadingOverlayContent
      message={message}
      submessage={submessage}
      icon={icon}
      style={style}
      pulse={pulse}
      spin={spin}
    />
  );

  if (embedded) {
    return (
      <View style={styles.embeddedRoot} pointerEvents="auto">
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      {content}
    </Modal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  embeddedRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Overlays.rgba15_23_42_032,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryGlow,
  },
  card: {
    width: '100%',
    maxWidth: 320,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconStage: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  orbitRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Overlays.borderPrimary18,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: -5,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  submessage: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
