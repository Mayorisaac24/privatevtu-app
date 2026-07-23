import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveVirtualCardDesign } from '../../lib/virtual-card-designs';
import { gradientStops } from '../../theme/gradient-utils';

export function VirtualCardWalletThumb({ designId }: { designId?: string | null }) {
  const design = resolveVirtualCardDesign(designId);
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={gradientStops(design.gradient)}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 42,
    height: 30,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#0F0D16',
  },
});
