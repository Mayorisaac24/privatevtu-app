import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GlassSurface, type GlassVariant } from './GlassSurface';
import { useCardGlassVariant } from '../../theme/hooks';

type GlassCardProps = {
  children: ReactNode;
  variant?: GlassVariant;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padding?: number;
};

export function GlassCard({
  children,
  variant,
  borderRadius = 16,
  style,
  contentStyle,
  padding = 16,
}: GlassCardProps) {
  const defaultVariant = useCardGlassVariant();
  const resolvedVariant = variant ?? defaultVariant;

  return (
    <GlassSurface
      variant={resolvedVariant}
      borderRadius={borderRadius}
      style={style}
      contentStyle={[{ padding }, contentStyle]}
    >
      {children}
    </GlassSurface>
  );
}
