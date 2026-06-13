import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../theme';
import { GlassSurface } from './GlassSurface';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  glass?: boolean;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
  glass = true,
}: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.75, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  if (glass) {
    return (
      <Animated.View style={[{ width: width as any, height, borderRadius, opacity: anim, overflow: 'hidden' }, style]}>
        <GlassSurface
          variant="tinted"
          borderRadius={borderRadius}
          intensity={36}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: Colors.border,
        opacity: anim,
      }, style]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <GlassSurface variant="light" borderRadius={Radius.lg} contentStyle={[{ padding: 16, gap: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={10} />
        </View>
        <Skeleton width={60} height={14} />
      </View>
    </GlassSurface>
  );
}
