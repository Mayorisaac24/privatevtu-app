export type LivenessStep = 'align' | 'blink' | 'turn_left' | 'turn_right' | 'capture';

export const LIVENESS_CHALLENGE_STEPS: LivenessStep[] = [
  'align',
  'blink',
  'turn_left',
  'turn_right',
];

export const LIVENESS_CAPTURE_COUNTDOWN_SEC = 3;
export const LIVENESS_MIN_SESSION_MS = 8000;

export type FaceLivenessMethod =
  | 'guided_live_scan_v2'
  | 'automated_live_scan_v3'
  | 'mlkit_live_scan_v4';

export type FaceLivenessResult = {
  dataUri: string;
  metadata: {
    livenessVerified: true;
    method: FaceLivenessMethod;
    challengesCompleted: LivenessStep[];
    capturedAt: string;
    sessionDurationMs: number;
  };
};

const VALID_METHODS: FaceLivenessMethod[] = [
  'mlkit_live_scan_v4',
  'automated_live_scan_v3',
  'guided_live_scan_v2',
];

export function isFaceLivenessMetadataValid(metadata: unknown): metadata is FaceLivenessResult['metadata'] {
  if (!metadata || typeof metadata !== 'object') return false;

  const meta = metadata as FaceLivenessResult['metadata'];
  if (meta.livenessVerified !== true) return false;
  if (!VALID_METHODS.includes(meta.method)) return false;
  if (!Array.isArray(meta.challengesCompleted)) return false;

  const completed = meta.challengesCompleted;
  const hasAllChallenges = LIVENESS_CHALLENGE_STEPS.every((step) => completed.includes(step))
    && completed.includes('capture');

  if (!hasAllChallenges) return false;
  if (typeof meta.sessionDurationMs !== 'number' || meta.sessionDurationMs < LIVENESS_MIN_SESSION_MS) {
    return false;
  }

  return true;
}
