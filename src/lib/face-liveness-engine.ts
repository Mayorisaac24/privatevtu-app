import type { Face } from 'react-native-vision-camera-face-detector';

export const FACE_HOLD_MS = 700;
export const YAW_LEFT_THRESHOLD = -10;
export const YAW_RIGHT_THRESHOLD = 10;
export const YAW_CENTER_MAX = 18;
export const PITCH_CENTER_MAX = 22;
export const EYE_CLOSED_MAX = 0.42;
export const EYE_OPEN_MIN = 0.4;
export const FACE_MIN_WIDTH_RATIO = 0.12;
export const FACE_MAX_WIDTH_RATIO = 0.78;
export const FACE_CENTER_X_MAX = 0.24;
export const FACE_CENTER_Y_MAX = 0.28;

export type AlignmentIssue = 'too_small' | 'too_large' | 'off_center' | 'not_forward' | null;

export function pickPrimaryFace(faces: Face[]): Face | null {
  if (!faces.length) return null;
  return faces.reduce((largest, face) => {
    const area = face.bounds.width * face.bounds.height;
    const largestArea = largest.bounds.width * largest.bounds.height;
    return area > largestArea ? face : largest;
  });
}

export function isFaceLargeEnough(face: Face, frameWidth: number): boolean {
  const ratio = face.bounds.width / frameWidth;
  return ratio >= FACE_MIN_WIDTH_RATIO && ratio <= FACE_MAX_WIDTH_RATIO;
}

export function isFaceCentered(face: Face, frameWidth: number, frameHeight: number): boolean {
  const centerX = face.bounds.x + face.bounds.width / 2;
  const centerY = face.bounds.y + face.bounds.height / 2;
  const dx = Math.abs(centerX / frameWidth - 0.5);
  const dy = Math.abs(centerY / frameHeight - 0.5);
  return dx <= FACE_CENTER_X_MAX && dy <= FACE_CENTER_Y_MAX;
}

export function getAlignmentIssue(
  face: Face,
  frameWidth: number,
  frameHeight: number,
): AlignmentIssue {
  const ratio = face.bounds.width / frameWidth;
  if (ratio < FACE_MIN_WIDTH_RATIO) return 'too_small';
  if (ratio > FACE_MAX_WIDTH_RATIO) return 'too_large';
  if (!isFaceCentered(face, frameWidth, frameHeight)) return 'off_center';
  if (!isHeadForward(face)) return 'not_forward';
  return null;
}

export function isHeadForward(face: Face): boolean {
  return Math.abs(face.yawAngle) <= YAW_CENTER_MAX
    && Math.abs(face.pitchAngle) <= PITCH_CENTER_MAX;
}

/** Step 1: size + rough placement (preview crop makes pixel-perfect centering unreliable). */
export function isPositionedFace(face: Face, frameWidth: number, frameHeight: number): boolean {
  const ratio = face.bounds.width / frameWidth;
  if (ratio < FACE_MIN_WIDTH_RATIO || ratio > FACE_MAX_WIDTH_RATIO) {
    return false;
  }

  const centerX = face.bounds.x + face.bounds.width / 2;
  const centerY = face.bounds.y + face.bounds.height / 2;
  const dx = Math.abs(centerX / frameWidth - 0.5);
  const dy = Math.abs(centerY / frameHeight - 0.5);
  return dx <= 0.34 && dy <= 0.38;
}

export function getPositionIssue(
  face: Face,
  frameWidth: number,
  frameHeight: number,
): AlignmentIssue {
  const ratio = face.bounds.width / frameWidth;
  if (ratio < FACE_MIN_WIDTH_RATIO) return 'too_small';
  if (ratio > FACE_MAX_WIDTH_RATIO) return 'too_large';

  const centerX = face.bounds.x + face.bounds.width / 2;
  const centerY = face.bounds.y + face.bounds.height / 2;
  const dx = Math.abs(centerX / frameWidth - 0.5);
  const dy = Math.abs(centerY / frameHeight - 0.5);
  if (dx > 0.34 || dy > 0.38) return 'off_center';
  return null;
}

export function isAlignedFace(face: Face, frameWidth: number, frameHeight: number): boolean {
  return isPositionedFace(face, frameWidth, frameHeight)
    && isHeadForward(face);
}

/** 0–1 quality score for picking the best stealth capture during the scan. */
export function scoreCaptureQuality(
  face: Face,
  frameWidth: number,
  frameHeight: number,
): number {
  if (!isAlignedFace(face, frameWidth, frameHeight) || !areEyesOpen(face)) {
    return 0;
  }

  const centerX = face.bounds.x + face.bounds.width / 2;
  const centerY = face.bounds.y + face.bounds.height / 2;
  const dx = Math.abs(centerX / frameWidth - 0.5);
  const dy = Math.abs(centerY / frameHeight - 0.5);
  const ratio = face.bounds.width / frameWidth;
  const optimalSize = 0.32;

  const sizeScore = 1 - Math.min(1, Math.abs(ratio - optimalSize) / 0.25);
  const centerScore = 1 - Math.min(1, (dx / 0.34 + dy / 0.38) / 2);
  const poseScore = 1 - Math.min(
    1,
    (Math.abs(face.yawAngle) / YAW_CENTER_MAX + Math.abs(face.pitchAngle) / PITCH_CENTER_MAX) / 2,
  );

  return sizeScore * 0.3 + centerScore * 0.4 + poseScore * 0.3;
}

export function isMouthOpen(face: Face): boolean {
  return isSpeakingMouthOpen(face);
}

/** Requires clear lip separation — avoids false triggers from resting face / slight smile. */
export function isSpeakingMouthOpen(face: Face): boolean {
  const lowerLipTop = face.contours?.LOWER_LIP_TOP;
  const lowerLipBottom = face.contours?.LOWER_LIP_BOTTOM;
  const upperLipBottom = face.contours?.UPPER_LIP_BOTTOM;
  if (!lowerLipTop?.length || !lowerLipBottom?.length) {
    return false;
  }

  const lipGap = Math.abs(lowerLipBottom[0].y - lowerLipTop[0].y);
  const mouthWidth = Math.abs(
    (face.landmarks?.MOUTH_RIGHT?.x ?? 0) - (face.landmarks?.MOUTH_LEFT?.x ?? 0),
  ) || face.bounds.width * 0.35;
  if (mouthWidth <= 0) {
    return false;
  }

  const openRatio = lipGap / mouthWidth;
  if (openRatio < 0.2) {
    return false;
  }

  if (upperLipBottom?.length) {
    const jawOpen = Math.abs(lowerLipTop[0].y - upperLipBottom[0].y);
    if (jawOpen / mouthWidth < 0.14) {
      return false;
    }
  }

  return areEyesOpen(face);
}

export type SpeechTracker = {
  sawClosedMouth: boolean;
  speechStartedAt: number | null;
};

export function createSpeechTracker(): SpeechTracker {
  return { sawClosedMouth: false, speechStartedAt: null };
}

export function updateSpeechTracker(
  tracker: SpeechTracker,
  face: Face,
  now: number,
  holdMs: number,
): boolean {
  const speaking = isSpeakingMouthOpen(face);

  if (!tracker.sawClosedMouth) {
    if (!speaking) {
      tracker.sawClosedMouth = true;
    }
    return false;
  }

  if (!speaking) {
    tracker.speechStartedAt = null;
    return false;
  }

  if (tracker.speechStartedAt == null) {
    tracker.speechStartedAt = now;
    return false;
  }

  return now - tracker.speechStartedAt >= holdMs;
}

export function isHeadTurnedLeft(face: Face): boolean {
  return face.yawAngle <= YAW_LEFT_THRESHOLD;
}

export function isHeadTurnedRight(face: Face): boolean {
  return face.yawAngle >= YAW_RIGHT_THRESHOLD;
}

export function areEyesClosed(face: Face): boolean {
  return face.leftEyeOpenProbability <= EYE_CLOSED_MAX
    && face.rightEyeOpenProbability <= EYE_CLOSED_MAX;
}

export function areEyesOpen(face: Face): boolean {
  return face.leftEyeOpenProbability >= EYE_OPEN_MIN
    && face.rightEyeOpenProbability >= EYE_OPEN_MIN;
}

export type BlinkTracker = {
  phase: 'waiting_open' | 'waiting_close' | 'waiting_reopen';
};

export function createBlinkTracker(): BlinkTracker {
  return { phase: 'waiting_open' };
}

export function updateBlinkTracker(tracker: BlinkTracker, face: Face): boolean {
  if (tracker.phase === 'waiting_open') {
    if (areEyesOpen(face)) {
      tracker.phase = 'waiting_close';
    }
    return false;
  }

  if (tracker.phase === 'waiting_close') {
    if (areEyesClosed(face)) {
      tracker.phase = 'waiting_reopen';
    }
    return false;
  }

  if (areEyesOpen(face)) {
    return true;
  }

  return false;
}
