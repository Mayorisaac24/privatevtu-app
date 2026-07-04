import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FaceLivenessResult } from '../lib/face-liveness-types';
import { isVisionCameraNativeAvailable, resetVisionCameraAvailabilityCache } from '../lib/vision-camera-available';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../theme';

const LazyFaceLivenessScanner = lazy(async () => {
  const mod = await import('./SpokenFaceLivenessScanner');
  return { default: mod.SpokenFaceLivenessScanner };
});

type Props = {
  visible: boolean;
  sessionId: string;
  spokenPhrase: string;
  expiresAt: string;
  onClose: () => void;
  onComplete: (result: FaceLivenessResult) => void;
};

function RebuildRequiredModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { marginBottom: insets.bottom + 16 }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="construct-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Native rebuild required</Text>
          <Text style={styles.body}>
            Live face scan needs a fresh native build with face detection enabled. Close the app completely, rebuild, then open the new build — not Expo Go.
          </Text>
          <Text style={styles.code}>npx expo prebuild --clean{'\n'}npx expo run:ios{'\n'}# or npx expo run:android</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function FaceLivenessScannerGate({
  visible,
  sessionId,
  spokenPhrase,
  expiresAt,
  onClose,
  onComplete,
}: Props) {
  const styles = useStyles();

  const [nativeReady, setNativeReady] = useState(() => isVisionCameraNativeAvailable());
  const [shouldMountScanner, setShouldMountScanner] = useState(false);

  useEffect(() => {
    if (!visible) return;
    resetVisionCameraAvailabilityCache();
    setNativeReady(isVisionCameraNativeAvailable());
  }, [visible]);

  useEffect(() => {
    if (visible && nativeReady) {
      setShouldMountScanner(true);
    }
  }, [visible, nativeReady]);

  if (!visible) return null;

  if (!nativeReady) {
    return <RebuildRequiredModal visible={visible} onClose={onClose} />;
  }

  if (!shouldMountScanner) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.loadingBackdrop}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </Modal>
    );
  }

  return (
    <Suspense
      fallback={(
        <Modal visible transparent animationType="fade">
          <View style={styles.loadingBackdrop}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        </Modal>
      )}
    >
      <LazyFaceLivenessScanner
        visible={visible}
        sessionId={sessionId}
        spokenPhrase={spokenPhrase}
        expiresAt={expiresAt}
        onClose={onClose}
        onComplete={onComplete}
      />
    </Suspense>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Overlays.rgba15_23_42_055,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark,
  },
  body: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  code: {
    fontSize: 12,
    color: colors.primaryDeep,
    backgroundColor: colors.pinFilled,
    padding: 12,
    borderRadius: Radius.lg,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  btn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  loadingBackdrop: {
    flex: 1,
    backgroundColor: Overlays.rgba15_23_42_045,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
