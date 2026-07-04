import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type LayoutChangeEvent,
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
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../theme';
import {
  createBlinkTracker,
  getPositionIssue,
  isHeadTurnedLeft,
  isHeadTurnedRight,
  isPositionedFace,
  pickPrimaryFace,
  scoreCaptureQuality,
  updateBlinkTracker,
  type AlignmentIssue,
} from '../lib/face-liveness-engine';
import {
  faceToFrameMetadata,
  phaseForIndex,
  type LivenessFramePayload,
} from '../lib/face-liveness-frame-utils';
import {
  LIVENESS_FRAME_SAMPLE_MS,
  LIVENESS_MAX_FRAMES_PER_STEP,
  LIVENESS_MIN_FRAMES_PER_STEP,
  LIVENESS_MIN_STEP_FRAMES_BEFORE_COMPLETE,
  LIVENESS_REVIEW_DISPLAY_MS,
  SILENT_CAPTURE_MIN_INTERVAL_MS,
  SILENT_CAPTURE_MIN_SCORE,
  type FaceLivenessResult,
  type LivenessSessionChallenge,
  type LivenessStep,
} from '../lib/face-liveness-types';
import { api, isResponseSuccess } from '../lib/api';

export type { FaceLivenessResult } from '../lib/face-liveness-types';

type StepConfig = {
  key: LivenessStep;
  holdMs: number;
  title: string;
  subtitle: string;
  waitingSubtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ScanPhase = 'scanning' | 'review' | 'processing';

type StoredCapture = {
  dataUri: string;
  score: number;
  capturedAt: string;
};

const STEP_LABELS: Record<LivenessStep, {
  title: string;
  subtitle: string;
  waitingSubtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  align: {
    title: 'Position your face',
    subtitle: 'Face detected — hold still',
    waitingSubtitle: 'Center your face inside the oval',
    icon: 'scan-outline',
  },
  blink: {
    title: 'Blink slowly',
    subtitle: 'Blink detected',
    waitingSubtitle: 'Open your eyes, then blink naturally',
    icon: 'eye-outline',
  },
  turn_left: {
    title: 'Turn head left',
    subtitle: 'Left turn detected',
    waitingSubtitle: 'Turn your head to the left',
    icon: 'arrow-back-outline',
  },
  turn_right: {
    title: 'Turn head right',
    subtitle: 'Right turn detected',
    waitingSubtitle: 'Turn your head to the right',
    icon: 'arrow-forward-outline',
  },
};

function buildSteps(challenges: LivenessSessionChallenge[]): StepConfig[] {
  return challenges.map((challenge) => ({
    key: challenge.step,
    holdMs: challenge.holdMs,
    ...STEP_LABELS[challenge.step],
  }));
}

function alignmentHint(issue: AlignmentIssue): string | null {
  switch (issue) {
    case 'too_small':
      return 'Move a little closer to the camera';
    case 'too_large':
      return 'Move back slightly';
    case 'off_center':
      return 'Center your face inside the oval';
    case 'not_forward':
      return 'Look straight at the camera';
    default:
      return null;
  }
}

const SILENT_PHOTO_OPTIONS = { flash: 'off' as const, enableShutterSound: false };

async function photoToDataUri(photoPath: string): Promise<string> {
  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
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

  return `data:image/jpeg;base64,${base64}`;
}

type Props = {
  visible: boolean;
  sessionId: string;
  challenges: LivenessSessionChallenge[];
  expiresAt: string;
  onClose: () => void;
  onComplete: (result: FaceLivenessResult) => void;
};

export function FaceLivenessScanner({
  visible,
  sessionId,
  challenges,
  expiresAt,
  onClose,
  onComplete,
}: Props) {
  const styles = useStyles();

  const steps = useMemo(() => buildSteps(challenges), [challenges]);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<VisionCameraType>(null);
  const cameraSizeRef = useRef({ width: 0, height: 0 });
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const sessionFinishedRef = useRef(false);
  const sessionStartedAt = useRef(Date.now());
  const completedChallengesRef = useRef<LivenessStep[]>([]);
  const stepIndexRef = useRef(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const blinkTrackerRef = useRef(createBlinkTracker());
  const bestCaptureRef = useRef<StoredCapture | null>(null);
  const lastCaptureAttemptRef = useRef(0);
  const silentCaptureInFlightRef = useRef(false);
  const stepFramesRef = useRef<LivenessFramePayload[]>([]);
  const lastSampleAtRef = useRef(0);
  const stepUploadingRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [stepSatisfied, setStepSatisfied] = useState(false);
  const [facePresent, setFacePresent] = useState(false);
  const [alignmentIssue, setAlignmentIssue] = useState<AlignmentIssue>(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [reviewImageUri, setReviewImageUri] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const reset = useCallback(() => {
    stepIndexRef.current = 0;
    setStepIndex(0);
    setPhase('scanning');
    setError(null);
    setStepSatisfied(false);
    setFacePresent(false);
    setAlignmentIssue(null);
    setReviewImageUri(null);
    sessionFinishedRef.current = false;
    completedChallengesRef.current = [];
    holdStartedAtRef.current = null;
    blinkTrackerRef.current = createBlinkTracker();
    bestCaptureRef.current = null;
    lastCaptureAttemptRef.current = 0;
    silentCaptureInFlightRef.current = false;
    stepFramesRef.current = [];
    lastSampleAtRef.current = 0;
    stepUploadingRef.current = false;
    sessionStartedAt.current = Date.now();
  }, []);

  const handleRetry = useCallback(() => {
    const finishedAllSteps = completedChallengesRef.current.length >= steps.length;
    if (finishedAllSteps) {
      onClose();
      return;
    }
    reset();
  }, [onClose, reset, steps.length]);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (!hasPermission) {
      void requestPermission();
    }
  }, [visible, hasPermission, requestPermission, reset]);

  const onCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    cameraSizeRef.current = { width, height };
    setCameraLayout((prev) => (
      prev.width === width && prev.height === height ? prev : { width, height }
    ));
  }, []);

  const getDetectionSpace = useCallback((frame: { width: number; height: number }) => {
    const { width, height } = cameraSizeRef.current;
    if (width > 0 && height > 0) {
      return { width, height };
    }
    return { width: frame.width, height: frame.height };
  }, []);

  const storeCapture = useCallback((dataUri: string, score: number) => {
    const current = bestCaptureRef.current;
    if (current && score <= current.score + 0.04) return;
    bestCaptureRef.current = {
      dataUri,
      score,
      capturedAt: new Date().toISOString(),
    };
  }, []);

  const capturePhotoSilently = useCallback(async (score: number) => {
    if (!cameraRef.current || silentCaptureInFlightRef.current || phaseRef.current !== 'scanning') {
      return;
    }

    silentCaptureInFlightRef.current = true;
    lastCaptureAttemptRef.current = Date.now();

    try {
      const photo = await cameraRef.current.takePhoto(SILENT_PHOTO_OPTIONS);
      if (!photo?.path) return;
      const dataUri = await photoToDataUri(photo.path);
      storeCapture(dataUri, score);
    } catch {
      // Silent capture failures are expected occasionally — keep scanning.
    } finally {
      silentCaptureInFlightRef.current = false;
    }
  }, [storeCapture]);

  const maybeCaptureSilently = useCallback((face: Face, space: { width: number; height: number }) => {
    if (phaseRef.current !== 'scanning' || silentCaptureInFlightRef.current) return;

    const score = scoreCaptureQuality(face, space.width, space.height);
    if (score < SILENT_CAPTURE_MIN_SCORE) return;
    if (Date.now() - lastCaptureAttemptRef.current < SILENT_CAPTURE_MIN_INTERVAL_MS) return;

    const current = bestCaptureRef.current;
    if (current && score <= current.score + 0.04) return;

    void capturePhotoSilently(score);
  }, [capturePhotoSilently]);

  const sampleStepFrame = useCallback((
    face: Face,
    space: { width: number; height: number },
    force = false,
  ) => {
    if (phaseRef.current !== 'scanning' || stepUploadingRef.current) return;
    if (stepFramesRef.current.length >= LIVENESS_MAX_FRAMES_PER_STEP) return;
    if (!force && Date.now() - lastSampleAtRef.current < LIVENESS_FRAME_SAMPLE_MS) return;

    lastSampleAtRef.current = Date.now();
    const index = stepFramesRef.current.length;
    stepFramesRef.current.push({
      phase: phaseForIndex(index, LIVENESS_MAX_FRAMES_PER_STEP),
      capturedAt: new Date().toISOString(),
      metadata: faceToFrameMetadata(face, space.width, space.height),
    });
  }, []);

  const hasEnoughStepFrames = useCallback(() => (
    stepFramesRef.current.length >= LIVENESS_MIN_STEP_FRAMES_BEFORE_COMPLETE
  ), []);

  const completeSession = useCallback(async (capture: StoredCapture) => {
    setReviewImageUri(capture.dataUri);
    setPhase('review');

    try {
      const completeRes = await api.completeLivenessSession(sessionId);
      if (!isResponseSuccess(completeRes) || !completeRes.data) {
        throw new Error(completeRes.message || 'Could not verify face scan');
      }

      if (!completeRes.data.passed) {
        throw new Error(
          'We could not confirm your live scan. Please try again in good lighting, facing the camera directly.',
        );
      }

      setTimeout(() => {
        setPhase('processing');
        onComplete({
          dataUri: capture.dataUri,
          metadata: {
            livenessSessionId: sessionId,
            livenessVerified: true,
            method: 'mlkit_live_scan_v5',
            serverDecision: completeRes.data!.decision,
            challengesCompleted: [...completedChallengesRef.current],
            capturedAt: capture.capturedAt,
            sessionDurationMs: Date.now() - sessionStartedAt.current,
            decisionReasons: completeRes.data!.reasons,
          },
        });
        onClose();
      }, LIVENESS_REVIEW_DISPLAY_MS);
    } catch (err) {
      sessionFinishedRef.current = false;
      setPhase('scanning');
      setReviewImageUri(null);
      setError(err instanceof Error ? err.message : 'Could not verify face scan');
    }
  }, [onClose, onComplete, sessionId]);

  const finishSession = useCallback(async () => {
    if (sessionFinishedRef.current) return;
    sessionFinishedRef.current = true;
    setError(null);

    let capture = bestCaptureRef.current;

    if (!capture && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto(SILENT_PHOTO_OPTIONS);
        if (photo?.path) {
          const dataUri = await photoToDataUri(photo.path);
          capture = {
            dataUri,
            score: 0.5,
            capturedAt: new Date().toISOString(),
          };
          bestCaptureRef.current = capture;
        }
      } catch {
        // Fall through to error below.
      }
    }

    if (!capture) {
      sessionFinishedRef.current = false;
      setError('We could not get a clear face image. Please try again and keep your face centered.');
      return;
    }

    completeSession(capture);
  }, [completeSession]);

  const advanceStep = useCallback(async (completedKey: LivenessStep) => {
    const current = steps[stepIndexRef.current];
    if (!current || current.key !== completedKey || stepUploadingRef.current) return;

    if (stepFramesRef.current.length < LIVENESS_MIN_FRAMES_PER_STEP) {
      setError('Hold still for a moment while we capture your face.');
      holdStartedAtRef.current = null;
      return;
    }

    stepUploadingRef.current = true;
    setError(null);

    try {
      const uploadRes = await api.submitLivenessStep(
        sessionId,
        completedKey,
        stepFramesRef.current,
      );
      if (!isResponseSuccess(uploadRes)) {
        throw new Error(uploadRes.message || 'Could not upload step evidence');
      }
    } catch (err) {
      stepUploadingRef.current = false;
      setError(err instanceof Error ? err.message : 'Could not upload step evidence');
      return;
    }

    stepUploadingRef.current = false;
    completedChallengesRef.current = [...completedChallengesRef.current, completedKey];
    holdStartedAtRef.current = null;
    blinkTrackerRef.current = createBlinkTracker();
    stepFramesRef.current = [];
    lastSampleAtRef.current = 0;
    setStepSatisfied(false);

    const nextIndex = stepIndexRef.current + 1;
    if (nextIndex >= steps.length) {
      void finishSession();
      return;
    }

    stepIndexRef.current = nextIndex;
    setStepIndex(nextIndex);
  }, [finishSession, sessionId, steps]);

  const onFacesDetected = useCallback((faces: Face[], frame: { width: number; height: number }) => {
    if (phaseRef.current !== 'scanning') return;

    const face = pickPrimaryFace(faces);
    setFacePresent(!!face);

    const step = steps[stepIndexRef.current];
    if (!step) return;

    const space = getDetectionSpace(frame);

    if (!face) {
      holdStartedAtRef.current = null;
      setStepSatisfied(false);
      setAlignmentIssue(null);
      return;
    }

    sampleStepFrame(face, space);
    maybeCaptureSilently(face, space);

    const holdMs = step.holdMs;
    const readyToAdvance = (key: LivenessStep) => {
      if (!hasEnoughStepFrames()) return;
      setStepSatisfied(true);
      void advanceStep(key);
    };

    if (step.key === 'align') {
      const issue = getPositionIssue(face, space.width, space.height);
      setAlignmentIssue(issue);

      if (isPositionedFace(face, space.width, space.height)) {
        if (holdStartedAtRef.current == null) {
          holdStartedAtRef.current = Date.now();
        }
        if (Date.now() - holdStartedAtRef.current >= holdMs) {
          readyToAdvance('align');
        }
      } else {
        holdStartedAtRef.current = null;
        setStepSatisfied(false);
      }
      return;
    }

    setAlignmentIssue(null);

    if (step.key === 'blink') {
      const blinkDone = updateBlinkTracker(blinkTrackerRef.current, face);
      if (blinkTrackerRef.current.phase === 'waiting_close') {
        sampleStepFrame(face, space, true);
      }
      if (blinkTrackerRef.current.phase === 'waiting_reopen') {
        sampleStepFrame(face, space, true);
      }
      if (blinkDone) {
        sampleStepFrame(face, space, true);
        readyToAdvance('blink');
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
        sampleStepFrame(face, space, true);
        if (Date.now() - holdStartedAtRef.current >= holdMs) {
          readyToAdvance('turn_left');
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
        sampleStepFrame(face, space, true);
        if (Date.now() - holdStartedAtRef.current >= holdMs) {
          readyToAdvance('turn_right');
        }
      } else {
        holdStartedAtRef.current = null;
        setStepSatisfied(false);
      }
    }
  }, [advanceStep, getDetectionSpace, hasEnoughStepFrames, maybeCaptureSilently, sampleStepFrame, steps]);

  const currentStep = steps[stepIndex] ?? steps[0];
  const progress = phase === 'review' || phase === 'processing'
    ? 100
    : steps.length
      ? ((stepIndex + 1) / steps.length) * 100
      : 0;
  const isReviewing = phase === 'review' || phase === 'processing';
  const subtitle = phase === 'review'
    ? 'Verification complete'
    : phase === 'processing'
      ? 'Saving your verified photo…'
      : stepSatisfied
        ? currentStep.subtitle
        : (alignmentHint(alignmentIssue) ?? currentStep.waitingSubtitle);
  const detectionReady = cameraLayout.width > 0 && cameraLayout.height > 0;
  const faceDetectionOptions = useMemo(
    () => ({
      performanceMode: 'fast' as const,
      classificationMode: 'all' as const,
      landmarkMode: 'none' as const,
      contourMode: 'none' as const,
      minFaceSize: 0.1,
      autoScale: true,
      windowWidth: cameraLayout.width,
      windowHeight: cameraLayout.height,
    }),
    [cameraLayout.width, cameraLayout.height],
  );

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
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
            disabled={isReviewing}
          >
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
            <View style={styles.cameraWrap} onLayout={onCameraLayout}>
              {isReviewing && reviewImageUri ? (
                <Image source={{ uri: reviewImageUri }} style={styles.camera} contentFit="cover" />
              ) : detectionReady ? (
                <FaceDetectionCamera
                  ref={cameraRef}
                  style={styles.camera}
                  device={device}
                  isActive={visible && phase === 'scanning'}
                  photo
                  faceDetectionOptions={faceDetectionOptions}
                  faceDetectionCallback={onFacesDetected}
                />
              ) : (
                <View style={styles.camera} />
              )}

              {!isReviewing ? (
                <View style={styles.overlay} pointerEvents="none">
                  <View style={[styles.faceOval, facePresent && styles.faceOvalActive]} />
                </View>
              ) : null}

              {phase === 'processing' ? (
                <View style={styles.captureOverlay}>
                  <ActivityIndicator color={Colors.white} size="large" />
                </View>
              ) : null}

              {phase === 'review' ? (
                <View style={styles.reviewBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                  <Text style={styles.reviewBadgeText}>Verified</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.instructionCard}>
              {phase === 'scanning' ? (
                <View style={styles.stepHeading}>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name={currentStep.icon} size={18} color={Colors.primaryLight} />
                  </View>
                  <Text style={styles.stepLabel}>Step {stepIndex + 1} of {steps.length}</Text>
                </View>
              ) : (
                <View style={styles.stepHeading}>
                  <View style={[styles.stepIconWrap, styles.stepIconWrapSuccess]}>
                    <Ionicons name="shield-checkmark" size={18} color={Palette.gotvBorder} />
                  </View>
                  <Text style={styles.stepLabel}>Complete</Text>
                </View>
              )}
              <Text style={styles.stepTitle}>
                {phase === 'review' || phase === 'processing' ? 'Face verified' : currentStep.title}
              </Text>
              <Text style={styles.stepSub}>{subtitle}</Text>

              {error ? (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.88}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </TouchableOpacity>
                </>
              ) : phase === 'scanning' ? (
                <Text style={styles.autoHint}>
                  {!detectionReady
                    ? 'Starting camera…'
                    : facePresent
                      ? (stepSatisfied
                        ? 'Verified — moving to next step…'
                        : 'Hold still while we verify your position')
                      : 'No face detected yet — move closer and face the camera'}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
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
    backgroundColor: Overlays.white12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  headerSub: { fontSize: 12, color: Overlays.white65, marginTop: 2 },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: colors.white, textAlign: 'center' },
  permissionSub: { fontSize: 14, color: Overlays.rgba255_255_255_07, textAlign: 'center', lineHeight: 20 },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  permissionBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Palette.scannerSurface,
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
    borderColor: Overlays.white55,
    backgroundColor: Overlays.violet06,
  },
  faceOvalActive: {
    borderColor: Overlays.rgba167_139_250_095,
    backgroundColor: Overlays.violet10,
  },
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Overlays.rgba15_23_42_035,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBadge: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Overlays.rgba22_163_74_092,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_025,
  },
  reviewBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Overlays.white12,
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  instructionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Overlays.white08,
    borderWidth: 1,
    borderColor: Overlays.white08,
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
    backgroundColor: Overlays.borderPrimary22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconWrapSuccess: {
    backgroundColor: Overlays.rgba22_163_74_022,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Overlays.white55,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  stepSub: {
    fontSize: 13,
    color: Overlays.white72,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: Palette.red300,
    lineHeight: 17,
    marginTop: 4,
  },
  autoHint: {
    marginTop: 8,
    fontSize: 12,
    color: Overlays.rgba255_255_255_05,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
