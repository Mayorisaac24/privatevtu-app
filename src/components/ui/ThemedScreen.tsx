import { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useColors } from '../../theme/hooks';
import { GlassAmbient } from './GlassAmbient';

type ThemedScreenProps = ViewProps & {
  children: ReactNode;
  style?: ViewStyle;
  /** Renders ambient background orbs. Default true. */
  withAmbient?: boolean;
};

/**
 * Standard app screen root — reactive page background + optional glass ambient layer.
 * Use this instead of hardcoding PAGE_BG or Colors.pageBg in StyleSheet roots.
 */
export function ThemedScreen({
  children,
  style,
  withAmbient = true,
  ...viewProps
}: ThemedScreenProps) {
  const colors = useColors();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.pageBg }, style]}
      {...viewProps}
    >
      {withAmbient ? <GlassAmbient /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
