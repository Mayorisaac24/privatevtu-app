export type LivenessStep = 'align' | 'blink' | 'turn_left' | 'turn_right';

export const LIVENESS_CHALLENGE_STEPS: LivenessStep[] = [
  'align',
  'blink',
  'turn_left',
  'turn_right',
];

export const LIVENESS_MIN_SESSION_MS = 6000;
export const LIVENESS_SPOKEN_MIN_SESSION_MS = 1200;
export const SPOKEN_RECORD_MS = 4000;
export const SPOKEN_ALIGN_HOLD_MS = 800;
export const SPOKEN_SPEECH_HOLD_MS = 700;
export const SPOKEN_MIN_RECORD_BEFORE_SPEECH_MS = 1200;
export const SPOKEN_MAX_RECORD_MS = 15000;
export const SILENT_CAPTURE_MIN_INTERVAL_MS = 2500;
export const SILENT_CAPTURE_MIN_SCORE = 0.52;
export const LIVENESS_REVIEW_DISPLAY_MS = 1800;
export const LIVENESS_FRAME_SAMPLE_MS = 160;
export const LIVENESS_MIN_FRAMES_PER_STEP = 3;
export const LIVENESS_MAX_FRAMES_PER_STEP = 5;
export const LIVENESS_MIN_STEP_FRAMES_BEFORE_COMPLETE = 3;

export type LivenessSessionChallenge = {
  step: LivenessStep;
  holdMs: number;
};

export type LivenessServerDecision = 'PASS' | 'FAIL' | 'NEEDS_REVIEW';

export type FaceLivenessMethod = 'mlkit_live_scan_v5' | 'spoken_challenge_v6';

export type FaceLivenessResult = {
  dataUri: string;
  metadata: {
    livenessSessionId: string;
    livenessVerified: true;
    method: FaceLivenessMethod;
    capturedAt: string;
    sessionDurationMs: number;
    serverDecision?: LivenessServerDecision;
    challengesCompleted?: LivenessStep[];
    decisionReasons?: string[];
    spokenPhrase?: string;
    recordingUrl?: string;
  };
};

export type LivenessSessionResponse = {
  sessionId: string;
  spokenPhrase: string;
  flowType: 'spoken_v6';
  expiresAt: string;
  expiresInSeconds: number;
};

export function isFaceLivenessMetadataValid(metadata: unknown): metadata is FaceLivenessResult['metadata'] {
  if (!metadata || typeof metadata !== 'object') return false;

  const meta = metadata as FaceLivenessResult['metadata'];
  if (!meta.livenessSessionId?.trim()) return false;
  if (meta.livenessVerified !== true) return false;

  if (meta.method === 'spoken_challenge_v6') {
    if (!meta.spokenPhrase?.trim() || !meta.recordingUrl?.trim()) return false;
    return typeof meta.sessionDurationMs === 'number'
      && meta.sessionDurationMs >= LIVENESS_SPOKEN_MIN_SESSION_MS;
  }

  if (meta.method !== 'mlkit_live_scan_v5') return false;
  if (meta.serverDecision !== 'PASS' && meta.serverDecision !== 'NEEDS_REVIEW') return false;
  if (!Array.isArray(meta.challengesCompleted)) return false;
  if (typeof meta.sessionDurationMs !== 'number' || meta.sessionDurationMs < LIVENESS_MIN_SESSION_MS) {
    return false;
  }

  return LIVENESS_CHALLENGE_STEPS.every((step) => meta.challengesCompleted!.includes(step));
}
