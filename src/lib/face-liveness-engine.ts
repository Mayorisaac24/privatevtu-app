import type { Face } from 'react-native-vision-camera-face-detector';

export const FACE_HOLD_MS = 900;
export const YAW_LEFT_THRESHOLD = -14;
export const YAW_RIGHT_THRESHOLD = 14;
export const YAW_CENTER_MAX = 10;
export const PITCH_CENTER_MAX = 14;
export const EYE_CLOSED_MAX = 0.28;
export const EYE_OPEN_MIN = 0.55;

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
  return ratio >= 0.16 && ratio <= 0.72;
}

export function isFaceCentered(face: Face, frameWidth: number, frameHeight: number): boolean {
  const centerX = face.bounds.x + face.bounds.width / 2;
  const centerY = face.bounds.y + face.bounds.height / 2;
  const dx = Math.abs(centerX / frameWidth - 0.5);
  const dy = Math.abs(centerY / frameHeight - 0.5);
  return dx <= 0.18 && dy <= 0.2;
}

export function isHeadForward(face: Face): boolean {
  return Math.abs(face.yawAngle) <= YAW_CENTER_MAX
    && Math.abs(face.pitchAngle) <= PITCH_CENTER_MAX;
}

export function isAlignedFace(face: Face, frameWidth: number, frameHeight: number): boolean {
  return isFaceLargeEnough(face, frameWidth)
    && isFaceCentered(face, frameWidth, frameHeight)
    && isHeadForward(face);
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
