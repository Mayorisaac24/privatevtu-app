import { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from './GlassSurface';

type GlassModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
  sheetStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  align?: 'bottom' | 'center';
};

export function GlassModal({
  visible,
  onClose,
  children,
  animationType = 'fade',
  sheetStyle,
  contentStyle,
  align = 'bottom',
}: GlassModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, align === 'center' && styles.overlayCenter]}
        onPress={onClose}
      >
        <BlurView
          intensity={18}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
        <View style={styles.overlayTint} pointerEvents="none" />

        <Pressable
          style={[
            align === 'bottom' ? styles.sheetBottom : styles.sheetCenter,
            align === 'bottom' && { paddingBottom: Math.max(insets.bottom, 16) },
            sheetStyle,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <GlassSurface
            variant="solid"
            borderRadius={align === 'bottom' ? 24 : 20}
            style={align === 'bottom' ? styles.sheet : undefined}
            contentStyle={[styles.sheetContent, contentStyle]}
          >
            {children}
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheetBottom: {
    width: '100%',
  },
  sheetCenter: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 12,
  },
});
