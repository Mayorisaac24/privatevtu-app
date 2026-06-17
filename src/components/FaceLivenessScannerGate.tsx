import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FaceLivenessResult } from '../lib/face-liveness-types';
import { isVisionCameraNativeAvailable } from '../lib/vision-camera-available';
import { Colors, Radius } from '../theme';

const LazyFaceLivenessScanner = lazy(async () => {
  const mod = await import('./FaceLivenessScanner');
  return { default: mod.FaceLivenessScanner };
});

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (result: FaceLivenessResult) => void;
};

function RebuildRequiredModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
            Live face scan now uses on-device face detection. Rebuild the app once, then try again.
          </Text>
          <Text style={styles.code}>npx expo prebuild --clean{'\n'}npx expo run:ios{'\n'}npx expo run:android</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function FaceLivenessScannerGate({ visible, onClose, onComplete }: Props) {
  const [nativeReady] = useState(() => isVisionCameraNativeAvailable());
  const [shouldMountScanner, setShouldMountScanner] = useState(false);

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
      <LazyFaceLivenessScanner visible={visible} onClose={onClose} onComplete={onComplete} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  body: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 20,
  },
  code: {
    fontSize: 12,
    color: Colors.primaryDeep,
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: Radius.lg,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  btn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  loadingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
