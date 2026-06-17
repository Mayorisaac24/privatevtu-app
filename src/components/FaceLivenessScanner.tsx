import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  type Camera as VisionCameraType,
} from 'react-native-vision-camera';
import {
  Camera as FaceDetectionCamera,
  type Face,
} from 'react-native-vision-camera-face-detector';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../theme';
import {
  createBlinkTracker,
  FACE_HOLD_MS,
  isAlignedFace,
  isHeadTurnedLeft,
  isHeadTurnedRight,
  pickPrimaryFace,
  updateBlinkTracker,
} from '../lib/face-liveness-engine';
import {
  LIVENESS_CAPTURE_COUNTDOWN_SEC,
  type FaceLivenessResult,
  type LivenessStep,
} from '../lib/face-liveness-types';

export type { FaceLivenessResult } from '../lib/face-liveness-types';

type StepConfig = {
  key: LivenessStep;
  title: string;
  subtitle: string;
  waitingSubtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STEPS: StepConfig[] = [
  {
    key: 'align',
    title: 'Position your face',
    subtitle: 'Face detected — hold still',
    waitingSubtitle: 'Center your face inside the oval',
    icon: 'scan-outline',
  },
  {
    key: 'blink',
    title: 'Blink slowly',
    subtitle: 'Blink detected',
    waitingSubtitle: 'Open your eyes, then blink naturally',
    icon: 'eye-outline',
  },
  {
    key: 'turn_left',
    title: 'Turn head left',
    subtitle: 'Left turn detected',
    waitingSubtitle: 'Turn your head to the left',
    icon: 'arrow-back-outline',
  },
  {
    key: 'turn_right',
    title: 'Turn head right',
    subtitle: 'Right turn detected',
    waitingSubtitle: 'Turn your head to the right',
    icon: 'arrow-forward-outline',
  },
  {
    key: 'capture',
    title: 'Hold still',
    subtitle: 'Capturing automatically…',
    waitingSubtitle: 'Look at the camera and hold still',
    icon: 'camera-outline',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (result: FaceLivenessResult) => void;
};

export function FaceLivenessScanner({ visible, onClose, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<VisionCameraType>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const captureStartedRef = useRef(false);
  const sessionStartedAt = useRef(Date.now());
  const completedChallengesRef = useRef<LivenessStep[]>([]);
  const stepIndexRef = useRef(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const blinkTrackerRef = useRef(createBlinkTracker());
  const captureCountdownStartedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'scanning' | 'capturing' | 'processing'>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [stepSatisfied, setStepSatisfied] = useState(false);
  const [facePresent, setFacePresent] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const reset = useCallback(() => {
    stepIndexRef.current = 0;
    setStepIndex(0);
    setPhase('scanning');
    setError(null);
    setCaptureCountdown(null);
    setStepSatisfied(false);
    setFacePresent(false);
    captureStartedRef.current = false;
    captureCountdownStartedRef.current = false;
    completedChallengesRef.current = [];
    holdStartedAtRef.current = null;
    blinkTrackerRef.current = createBlinkTracker();
    sessionStartedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (!hasPermission) {
      void requestPermission();
    }
  }, [visible, hasPermission, requestPermission, reset]);

  const advanceStep = useCallback((completedKey: LivenessStep) => {
    const current = STEPS[stepIndexRef.current];
    if (!current || current.key !== completedKey) return;

    completedChallengesRef.current = [...completedChallengesRef.current, completedKey];
    holdStartedAtRef.current = null;
    blinkTrackerRef.current = createBlinkTracker();
    captureCountdownStartedRef.current = false;
    setCaptureCountdown(null);
    setStepSatisfied(false);

    const nextIndex = stepIndexRef.current + 1;
    if (nextIndex >= STEPS.length) return;

    stepIndexRef.current = nextIndex;
    setStepIndex(nextIndex);
  }, []);

  const finishCapture = useCallback(async () => {
    if (!cameraRef.current || captureStartedRef.current) return;

    captureStartedRef.current = true;
    setPhase('capturing');
    setError(null);

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (!photo?.path) {
        throw new Error('Could not capture face scan. Please try again.');
      }

      setPhase('processing');

      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      let base64 = manipulated.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64) {
        throw new Error('Could not process face scan. Please try again.');
      }

      onComplete({
        dataUri: `data:image/jpeg;base64,${base64}`,
        metadata: {
          livenessVerified: true,
          method: 'mlkit_live_scan_v4',
          challengesCompleted: [...completedChallengesRef.current, 'capture'],
          capturedAt: new Date().toISOString(),
          sessionDurationMs: Date.now() - sessionStartedAt.current,
        },
      });
      onClose();
    } catch (err: unknown) {
      captureStartedRef.current = false;
      captureCountdownStartedRef.current = false;
      setPhase('scanning');
      setCaptureCountdown(null);
      const message = err instanceof Error ? err.message : 'Face scan failed';
      setError(message);
    }
  }, [onClose, onComplete]);

  const startCaptureCountdown = useCallback(() => {
    if (captureCountdownStartedRef.current) return;
    captureCountdownStartedRef.current = true;
    setCaptureCountdown(LIVENESS_CAPTURE_COUNTDOWN_SEC);

    const interval = setInterval(() => {
      setCaptureCountdown((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      void finishCapture();
    }, LIVENESS_CAPTURE_COUNTDOWN_SEC * 1000);
  }, [finishCapture]);

  const onFacesDetected = useCallback((faces: Face[], frame: { width: number; height: number }) => {
    if (phaseRef.current !== 'scanning') return;

    const face = pickPrimaryFace(faces);
    setFacePresent(!!face);

    const step = STEPS[stepIndexRef.current];
    if (!step) return;

    if (!face) {
      holdStartedAtRef.current = null;
      setStepSatisfied(false);
      return;
    }

    if (step.key === 'align') {
      if (isAlignedFace(face, frame.width, frame.height)) {
        if (holdStartedAtRef.current == null) {
          holdStartedAtRef.current = Date.now();
        }
        if (Date.now() - holdStartedAtRef.current >= FACE_HOLD_MS) {
          setStepSatisfied(true);
          advanceStep('align');
        }
      } else {
        holdStartedAtRef.current = null;
        setStepSatisfied(false);
      }
      return;
    }

    if (step.key === 'blink') {
      const blinkDone = updateBlinkTracker(blinkTrackerRef.current, face);
      if (blinkDone) {
        setStepSatisfied(true);
        advanceStep('blink');
      } else {
        setStepSatisfied(blinkTrackerRef.current.phase !== 'waiting_open');
      }
      return;
    }

    if (step.key === 'turn_left') {
      if (isHeadTurnedLeft(face)) {
        if (holdStartedAtRef.current == null) {
          holdStartedAtRef.current = Date.now();
        }
        if (Date.now() - holdStartedAtRef.current >= FACE_HOLD_MS) {
          setStepSatisfied(true);
          advanceStep('turn_left');
        }
      } else {
        holdStartedAtRef.current = null;
        setStepSatisfied(false);
      }
      return;
    }

    if (step.key === 'turn_right') {
      if (isHeadTurnedRight(face)) {
        if (holdStartedAtRef.current == null) {
          holdStartedAtRef.current = Date.now();
        }
        if (Date.now() - holdStartedAtRef.current >= FACE_HOLD_MS) {
          setStepSatisfied(true);
          advanceStep('turn_right');
        }
      } else {
        holdStartedAtRef.current = null;
        setStepSatisfied(false);
      }
      return;
    }

    if (step.key === 'capture') {
      if (isAlignedFace(face, frame.width, frame.height)) {
        if (holdStartedAtRef.current == null) {
          holdStartedAtRef.current = Date.now();
        }
        if (Date.now() - holdStartedAtRef.current >= FACE_HOLD_MS) {
          setStepSatisfied(true);
          startCaptureCountdown();
        }
      } else {
        holdStartedAtRef.current = null;
        captureCountdownStartedRef.current = false;
        setCaptureCountdown(null);
        setStepSatisfied(false);
      }
    }
  }, [advanceStep, startCaptureCountdown]);

  const currentStep = STEPS[stepIndex] ?? STEPS[0];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const isBusy = phase === 'capturing' || phase === 'processing';
  const subtitle = stepSatisfied ? currentStep.subtitle : currentStep.waitingSubtitle;

  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.permissionTitle}>Front camera unavailable</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={onClose}>
            <Text style={styles.permissionBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85} disabled={isBusy}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Live face scan</Text>
            <Text style={styles.headerSub}>Follow each prompt — we verify your face live</Text>
          </View>
        </View>

        {!hasPermission ? (
          <View style={styles.permissionWrap}>
            <Ionicons name="camera-outline" size={42} color={Colors.primary} />
            <Text style={styles.permissionTitle}>Camera access required</Text>
            <Text style={styles.permissionSub}>We need your front camera to verify you are physically present.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={() => { void requestPermission(); }}>
              <Text style={styles.permissionBtnText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cameraWrap}>
              <FaceDetectionCamera
                ref={cameraRef}
                style={styles.camera}
                device={device}
                isActive={visible && !isBusy}
                photo
                faceDetectionOptions={{
                  performanceMode: 'fast',
                  classificationMode: 'all',
                  landmarkMode: 'none',
                  contourMode: 'none',
                  minFaceSize: 0.12,
                  autoScale: true,
                  windowWidth: width,
                  windowHeight: height,
                }}
                faceDetectionCallback={onFacesDetected}
              />

              <View style={styles.overlay} pointerEvents="none">
                <View style={[styles.faceOval, facePresent && styles.faceOvalActive]} />
              </View>

              {isBusy ? (
                <View style={styles.captureOverlay}>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.overlayText}>
                    {phase === 'capturing' ? 'Capturing photo…' : 'Processing face scan…'}
                  </Text>
                </View>
              ) : null}

              {captureCountdown != null && captureCountdown > 0 && phase === 'scanning' ? (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{captureCountdown}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.instructionCard}>
              <View style={styles.stepHeading}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={currentStep.icon} size={18} color={Colors.primaryLight} />
                </View>
                <Text style={styles.stepLabel}>Step {stepIndex + 1} of {STEPS.length}</Text>
              </View>
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepSub}>{subtitle}</Text>

              {error ? (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={reset} activeOpacity={0.88}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.autoHint}>
                  {facePresent
                    ? 'Detecting your face — stay on this step until verified'
                    : 'No face detected yet — move closer and face the camera'}
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  permissionSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  permissionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111827',
    minHeight: 280,
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: '72%',
    aspectRatio: 0.72,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  faceOvalActive: {
    borderColor: 'rgba(167, 139, 250, 0.95)',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  overlayText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  countdownBadge: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  countdownText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
  },
  instructionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  stepSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 17,
    marginTop: 4,
  },
  autoHint: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});