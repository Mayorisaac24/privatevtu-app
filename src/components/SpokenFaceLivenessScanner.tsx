import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  type Camera as VisionCameraType,
} from 'react-native-vision-camera';
import {
  Camera as FaceDetectionCamera,
  type Face,
} from 'react-native-vision-camera-face-detector';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../theme';
import {
  getAlignmentIssue,
  isAlignedFace,
  createSpeechTracker,
  updateSpeechTracker,
  pickPrimaryFace,
  type AlignmentIssue,
} from '../lib/face-liveness-engine';
import { assertVideoSizeOk, optimizeLivenessPhoto } from '../lib/face-liveness-media-utils';
import {
  LIVENESS_SPOKEN_MIN_SESSION_MS,
  SPOKEN_ALIGN_HOLD_MS,
  SPOKEN_MAX_RECORD_MS,
  SPOKEN_MIN_RECORD_BEFORE_SPEECH_MS,
  SPOKEN_SPEECH_HOLD_MS,
  type FaceLivenessResult,
} from '../lib/face-liveness-types';
import { api, isResponseSuccess } from '../lib/api';

export type { FaceLivenessResult } from '../lib/face-liveness-types';

type ScanPhase = 'align' | 'speak' | 'processing' | 'error';

type Props = {
  visible: boolean;
  sessionId: string;
  spokenPhrase: string;
  expiresAt: string;
  onClose: () => void;
  onComplete: (result: FaceLivenessResult) => void;
};

const PHOTO_OPTIONS = { flash: 'off' as const, enableShutterSound: false };

function friendlyUploadError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Could not complete live face scan';
  if (
    message.includes('NSURLErrorDomain')
    || message.includes('SSL error')
    || message.includes('secure connection')
  ) {
    return 'Could not upload your recording securely. Please check your connection and try again.';
  }
  if (message.includes('body') && message.toLowerCase().includes('too large')) {
    return 'Recording is too large. Please try again with a shorter clip.';
  }
  return message;
}

function alignmentHint(issue: AlignmentIssue): string | null {
  switch (issue) {
    case 'too_small':
      return 'Move a little closer';
    case 'too_large':
      return 'Move back slightly';
    case 'off_center':
      return 'Center your face in the oval';
    case 'not_forward':
      return 'Look straight at the camera';
    default:
      return null;
  }
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const styles = useStyles();

  return (
    <View style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}>
      {done ? (
        <Ionicons name="checkmark" size={12} color={Colors.white} />
      ) : (
        <View style={[styles.stepDot, active && styles.stepDotActive]} />
      )}
      <Text style={[styles.stepPillText, active && styles.stepPillTextActive]}>{label}</Text>
    </View>
  );
}

export function SpokenFaceLivenessScanner({
  visible,
  sessionId,
  spokenPhrase,
  expiresAt,
  onClose,
  onComplete,
}: Props) {
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const cameraRef = useRef<VisionCameraType>(null);
  const cameraSizeRef = useRef({ width: 0, height: 0 });
  const device = useCameraDevice('front');
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

  const sessionStartedAt = useRef(Date.now());
  const flowLockedRef = useRef(false);
  const submittingRef = useRef(false);
  const alignTransitionRef = useRef(false);
  const capturedPhotoRef = useRef<string | null>(null);
  const alignStartedAtRef = useRef<number | null>(null);
  const recordStartedAtRef = useRef<number | null>(null);
  const speechTrackerRef = useRef(createSpeechTracker());
  const recordingPromiseRef = useRef<Promise<string> | null>(null);
  const phaseRef = useRef<ScanPhase>('align');

  const [phase, setPhase] = useState<ScanPhase>('align');
  const [error, setError] = useState<string | null>(null);
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignmentIssue, setAlignmentIssue] = useState<AlignmentIssue>(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  phaseRef.current = phase;

  const setScanPhase = useCallback((next: ScanPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetFlow = useCallback(() => {
    flowLockedRef.current = false;
    submittingRef.current = false;
    alignTransitionRef.current = false;
    capturedPhotoRef.current = null;
    alignStartedAtRef.current = null;
    recordStartedAtRef.current = null;
    speechTrackerRef.current = createSpeechTracker();
    recordingPromiseRef.current = null;
    sessionStartedAt.current = Date.now();
    void cameraRef.current?.stopRecording().catch(() => undefined);
    setScanPhase('align');
    setError(null);
    setFaceAligned(false);
    setAlignmentIssue(null);
  }, [setScanPhase]);

  useEffect(() => {
    if (!visible) return;
    resetFlow();
  }, [visible, sessionId, resetFlow]);

  const onCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    cameraSizeRef.current = { width, height };
    setCameraLayout({ width, height });
  }, []);

  const getDetectionSpace = useCallback((frame: { width: number; height: number }) => {
    if (cameraSizeRef.current.width > 0 && cameraSizeRef.current.height > 0) {
      return cameraSizeRef.current;
    }
    return frame;
  }, []);

  const startRecording = useCallback((): Promise<string> => {
    if (recordingPromiseRef.current) {
      return recordingPromiseRef.current;
    }

    recordingPromiseRef.current = new Promise<string>((resolve, reject) => {
      const camera = cameraRef.current;
      if (!camera) {
        reject(new Error('Camera is not ready'));
        return;
      }

      recordStartedAtRef.current = Date.now();

      camera.startRecording({
        flash: 'off',
        onRecordingFinished: (video) => {
          resolve(video.path);
        },
        onRecordingError: (recordingError) => {
          reject(new Error(recordingError.message || 'Recording failed'));
        },
      });
    });

    return recordingPromiseRef.current;
  }, []);

  const finishAndSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setScanPhase('processing');

    try {
      const dataUri = capturedPhotoRef.current;
      if (!dataUri) {
        throw new Error('Photo was not captured. Please try again.');
      }

      const recordPromise = recordingPromiseRef.current;
      if (!recordPromise) {
        throw new Error('Recording did not start. Please try again.');
      }

      const camera = cameraRef.current;
      if (!camera) {
        throw new Error('Camera is not ready');
      }

      await camera.stopRecording();
      const videoPath = await recordPromise;
      recordingPromiseRef.current = null;

      await assertVideoSizeOk(videoPath);

      const uploadRes = await api.uploadLivenessRecordingFile(videoPath, sessionId);
      if (!isResponseSuccess(uploadRes) || !uploadRes.data?.url) {
        throw new Error(uploadRes.message || 'Could not upload video recording');
      }

      const completeRes = await api.completeLivenessSession(sessionId, uploadRes.data.url);
      if (!isResponseSuccess(completeRes) || !completeRes.data?.passed) {
        throw new Error(completeRes.message || 'Could not verify live face scan');
      }

      const sessionDurationMs = Date.now() - sessionStartedAt.current;
      if (sessionDurationMs < LIVENESS_SPOKEN_MIN_SESSION_MS) {
        throw new Error('That was too quick. Please try again.');
      }

      const result: FaceLivenessResult = {
        dataUri,
        metadata: {
          livenessSessionId: sessionId,
          livenessVerified: true,
          method: 'spoken_challenge_v6',
          spokenPhrase,
          recordingUrl: uploadRes.data.url,
          capturedAt: new Date().toISOString(),
          sessionDurationMs,
        },
      };

      onComplete(result);
      onClose();
    } catch (err) {
      submittingRef.current = false;
      flowLockedRef.current = false;
      alignTransitionRef.current = false;
      capturedPhotoRef.current = null;
      recordingPromiseRef.current = null;
      recordStartedAtRef.current = null;
      speechTrackerRef.current = createSpeechTracker();
      setScanPhase('error');
      setError(friendlyUploadError(err));
    }
  }, [onClose, onComplete, sessionId, setScanPhase, spokenPhrase]);

  const beginSpeakPhase = useCallback(async () => {
    if (flowLockedRef.current || phaseRef.current !== 'align' || alignTransitionRef.current) return;
    alignTransitionRef.current = true;
    flowLockedRef.current = true;
    setError(null);

    try {
      const camera = cameraRef.current;
      if (!camera) {
        throw new Error('Camera is not ready');
      }

      const photo = await camera.takePhoto(PHOTO_OPTIONS);
      if (!photo?.path) {
        throw new Error('Could not capture your photo. Please try again.');
      }

      capturedPhotoRef.current = await optimizeLivenessPhoto(photo.path);
      speechTrackerRef.current = createSpeechTracker();
      setScanPhase('speak');
      startRecording();
    } catch (err) {
      flowLockedRef.current = false;
      alignTransitionRef.current = false;
      capturedPhotoRef.current = null;
      setScanPhase('error');
      setError(err instanceof Error ? err.message : 'Could not capture your photo');
    }
  }, [setScanPhase, startRecording]);

  const tryFinishFromSpeech = useCallback((face: Face) => {
    if (phaseRef.current !== 'speak' || !recordStartedAtRef.current) return;

    const recordAge = Date.now() - recordStartedAtRef.current;
    if (recordAge < SPOKEN_MIN_RECORD_BEFORE_SPEECH_MS) return;

    if (updateSpeechTracker(speechTrackerRef.current, face, Date.now(), SPOKEN_SPEECH_HOLD_MS)) {
      void finishAndSubmit();
      return;
    }

    if (recordAge >= SPOKEN_MAX_RECORD_MS) {
      submittingRef.current = false;
      flowLockedRef.current = false;
      alignTransitionRef.current = false;
      capturedPhotoRef.current = null;
      recordingPromiseRef.current = null;
      recordStartedAtRef.current = null;
      speechTrackerRef.current = createSpeechTracker();
      void cameraRef.current?.stopRecording().catch(() => undefined);
      setScanPhase('error');
      setError(`Please say "${spokenPhrase}" clearly, then we'll continue automatically.`);
    }
  }, [finishAndSubmit, setScanPhase, spokenPhrase]);

  const onFacesDetected = useCallback((faces: Face[], frame: { width: number; height: number }) => {
    const currentPhase = phaseRef.current;
    if (currentPhase !== 'align' && currentPhase !== 'speak') return;

    const face = pickPrimaryFace(faces);
    const space = getDetectionSpace(frame);

    if (!face) {
      alignStartedAtRef.current = null;
      setFaceAligned(false);
      setAlignmentIssue(null);
      return;
    }

    const aligned = isAlignedFace(face, space.width, space.height);
    const issue = getAlignmentIssue(face, space.width, space.height);
    setAlignmentIssue(issue);
    setFaceAligned(aligned);

    if (currentPhase === 'align') {
      if (!aligned) {
        alignStartedAtRef.current = null;
        return;
      }

      if (alignStartedAtRef.current == null) {
        alignStartedAtRef.current = Date.now();
        return;
      }

      if (Date.now() - alignStartedAtRef.current >= SPOKEN_ALIGN_HOLD_MS) {
        void beginSpeakPhase();
      }
      return;
    }

    if (currentPhase === 'speak') {
      if (!aligned) {
        speechTrackerRef.current = createSpeechTracker();
        return;
      }

      tryFinishFromSpeech(face);
    }
  }, [beginSpeakPhase, getDetectionSpace, tryFinishFromSpeech]);

  const requestPermissions = useCallback(async () => {
    const cameraGranted = hasCameraPermission || (await requestCameraPermission());
    const micGranted = hasMicPermission || (await requestMicPermission());
    if (!cameraGranted || !micGranted) {
      setError('Camera and microphone access are required for live face verification.');
    }
  }, [hasCameraPermission, hasMicPermission, requestCameraPermission, requestMicPermission]);

  useEffect(() => {
    if (!visible) return;
    if (!hasCameraPermission || !hasMicPermission) {
      void requestPermissions();
    }
  }, [visible, hasCameraPermission, hasMicPermission, requestPermissions]);

  const detectionReady = cameraLayout.width > 0 && cameraLayout.height > 0;
  const faceDetectionOptions = useMemo(
    () => ({
      performanceMode: 'fast' as const,
      classificationMode: 'all' as const,
      landmarkMode: 'all' as const,
      contourMode: 'all' as const,
      minFaceSize: 0.12,
      autoScale: true,
      windowWidth: cameraLayout.width,
      windowHeight: cameraLayout.height,
    }),
    [cameraLayout.width, cameraLayout.height],
  );

  const permissionsReady = hasCameraPermission && hasMicPermission;
  const expired = new Date(expiresAt).getTime() <= Date.now();
  const showPhrase = phase === 'speak' || phase === 'processing';

  const statusText = (() => {
    if (phase === 'processing') return 'Saving your scan…';
    if (phase === 'error') return 'Something went wrong';
    if (phase === 'speak') {
      return faceAligned
        ? `Say "${spokenPhrase}" out loud`
        : 'Keep your face in the oval';
    }
    return alignmentHint(alignmentIssue) ?? 'Position your face in the oval';
  })();

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
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Live face scan</Text>
            <Text style={styles.headerSub}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.stepsRow}>
          <StepPill label="Position face" active={phase === 'align'} done={phase === 'speak' || phase === 'processing'} />
          <View style={styles.stepLine} />
          <StepPill label="Say word" active={phase === 'speak'} done={phase === 'processing'} />
        </View>

        {!permissionsReady ? (
          <View style={styles.permissionWrap}>
            <Ionicons name="mic-outline" size={40} color={Colors.primary} />
            <Text style={styles.permissionTitle}>Camera & microphone needed</Text>
            <Text style={styles.permissionSub}>
              We need camera and mic access for a short verification clip while you say the word on screen.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={() => void requestPermissions()} activeOpacity={0.85}>
              <Text style={styles.permissionBtnText}>Allow access</Text>
            </TouchableOpacity>
          </View>
        ) : expired ? (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionTitle}>Session expired</Text>
            <Text style={styles.permissionSub}>Close and start a new live face scan.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.permissionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {showPhrase ? (
              <View style={styles.phraseCard}>
                <Text style={styles.phraseLabel}>Your word</Text>
                <Text style={styles.phraseWord}>{spokenPhrase}</Text>
              </View>
            ) : (
              <View style={styles.phrasePlaceholder}>
                <Ionicons name="scan-outline" size={18} color={Overlays.rgba255_255_255_05} />
                <Text style={styles.phrasePlaceholderText}>Face the camera to reveal your word</Text>
              </View>
            )}

            <View style={styles.cameraWrap} onLayout={onCameraLayout}>
              {detectionReady ? (
                <FaceDetectionCamera
                  ref={cameraRef}
                  style={styles.camera}
                  device={device}
                  isActive={visible && phase !== 'processing'}
                  photo
                  video
                  audio
                  videoBitRate="low"
                  faceDetectionCallback={onFacesDetected}
                  faceDetectionOptions={faceDetectionOptions}
                />
              ) : (
                <View style={[styles.camera, styles.centered]}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              )}

              <View style={styles.overlay} pointerEvents="none">
                <View style={[
                  styles.faceOval,
                  faceAligned && styles.faceOvalActive,
                  phase === 'speak' && faceAligned && styles.faceOvalSpeak,
                ]}
                />
              </View>

              {phase === 'processing' ? (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.processingText}>Almost done…</Text>
                </View>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                    <Text style={styles.secondaryBtnText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.retryBtn} onPress={resetFlow} activeOpacity={0.85}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.hint}>
                {phase === 'align'
                  ? 'Look straight at the camera. Your word appears once your face is centered.'
                  : 'Say the word clearly with your mouth open — we continue automatically.'}
              </Text>
            )}
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
    paddingBottom: 10,
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
  headerSub: { fontSize: 13, color: Overlays.white72, marginTop: 3, lineHeight: 18 },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Overlays.white08,
  },
  stepPillActive: {
    backgroundColor: Overlays.violet35,
  },
  stepPillDone: {
    backgroundColor: Overlays.rgba22_163_74_028,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Overlays.glassShine,
  },
  stepDotActive: {
    backgroundColor: colors.card,
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Overlays.white55,
  },
  stepPillTextActive: {
    color: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: Overlays.white12,
  },
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
  phraseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: Overlays.violet28,
    borderWidth: 1,
    borderColor: Overlays.rgba167_139_250_05,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  phraseLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Overlays.white65,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  phraseWord: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 3,
  },
  phrasePlaceholder: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Overlays.white10,
    backgroundColor: Overlays.rgba255_255_255_004,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phrasePlaceholderText: {
    fontSize: 13,
    color: Overlays.white55,
    fontWeight: '500',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Palette.scannerSurface,
    minHeight: 300,
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: '70%',
    aspectRatio: 0.72,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Overlays.rgba255_255_255_04,
    backgroundColor: Overlays.rgba124_58_237_004,
  },
  faceOvalActive: {
    borderColor: Overlays.rgba167_139_250_085,
    backgroundColor: Overlays.violet08,
  },
  faceOvalSpeak: {
    borderColor: Overlays.rgba52_211_153_095,
    backgroundColor: Overlays.emerald04,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Overlays.rgba15_23_42_072,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  processingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    marginTop: 14,
    marginHorizontal: 22,
    fontSize: 13,
    color: Overlays.white62,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBox: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Overlays.rgba220_38_38_014,
    borderWidth: 1,
    borderColor: Overlays.rgba248_113_113_035,
    gap: 10,
  },
  errorText: {
    color: Palette.red300,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_025,
  },
  secondaryBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: colors.card,
  },
  retryBtnText: {
    color: colors.primaryDeep,
    fontWeight: '700',
    fontSize: 13,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
