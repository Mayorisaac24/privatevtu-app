import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../theme';
import { GlassSurface } from './GlassSurface';


type GlassShimmerProps = {
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  compact?: boolean;
};

function PulseDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 480,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.35,
          duration: 480,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

export function GlassShimmer({
  height = 92,
  borderRadius = 16,
  style,
  compact = false,
}: GlassShimmerProps) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  return (
    <GlassSurface
      variant="tinted"
      borderRadius={borderRadius}
      intensity={44}
      style={[{ minHeight: height }, style]}
      contentStyle={[styles.body, compact ? styles.bodyCompact : undefined]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sweep,
          {
            transform: [{ translateX }],
          },
        ]}
      />
      <View style={styles.dotsRow}>
        <PulseDot delay={0} />
        <PulseDot delay={140} />
        <PulseDot delay={280} />
      </View>
    </GlassSurface>
  );
}

export function GlassRefreshVeil({ borderRadius = 16 }: { borderRadius?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.veilWrap, { borderRadius }]} pointerEvents="none">
      <GlassSurface
        variant="light"
        borderRadius={borderRadius}
        intensity={28}
        style={StyleSheet.absoluteFillObject}
        contentStyle={styles.veilBody}
      >
        <View style={styles.dotsRow}>
          <PulseDot delay={0} />
          <PulseDot delay={120} />
          <PulseDot delay={240} />
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bodyCompact: {
    minHeight: 72,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ skewX: '-18deg' }],
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  veilWrap: {
    overflow: 'hidden',
    zIndex: 2,
  },
  veilBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
