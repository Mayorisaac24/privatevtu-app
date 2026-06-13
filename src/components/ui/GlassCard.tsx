import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { GlassSurface, type GlassVariant } from './GlassSurface';

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
  variant = 'light',
  borderRadius = 16,
  style,
  contentStyle,
  padding = 16,
}: GlassCardProps) {
  return (
    <GlassSurface
      variant={variant}
      borderRadius={borderRadius}
      style={style}
      contentStyle={[{ padding }, contentStyle]}
    >
      {children}
    </GlassSurface>
  );
}
