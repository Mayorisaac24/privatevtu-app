import { StyleSheet, View } from 'react-native';
import { useColors } from '../../theme/hooks';
import { Palette } from '../../theme/colors/palette';

export function GlassAmbient() {
  const colors = useColors();

  return (
    <View style={[styles.layer, { backgroundColor: colors.pageBg }]} pointerEvents="none">
      <View style={[styles.orb, styles.orbPrimary, { backgroundColor: colors.ambientPrimary }]} />
      <View style={[styles.orb, styles.orbSecondary, { backgroundColor: colors.ambientSecondary }]} />
    </View>
  );
}

/** @deprecated Use ThemedScreen or useColors().pageBg */
export const PAGE_BG = Palette.pageBg;

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 260,
    height: 260,
    top: -80,
    right: -60,
  },
  orbSecondary: {
    width: 220,
    height: 220,
    top: 380,
    left: -90,
  },
});
