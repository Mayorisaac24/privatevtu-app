import type { Face } from 'react-native-vision-camera-face-detector';

export type LivenessFramePhase = 'before' | 'during' | 'after';

export type LivenessFramePayload = {
  phase: LivenessFramePhase;
  capturedAt: string;
  metadata: {
    capturedAt: string;
    yawAngle: number;
    pitchAngle: number;
    rollAngle: number;
    leftEyeOpenProbability: number;
    rightEyeOpenProbability: number;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    frameWidth: number;
    frameHeight: number;
  };
  imageBase64?: string;
};

export function faceToFrameMetadata(
  face: Face,
  frameWidth: number,
  frameHeight: number,
) {
  return {
    capturedAt: new Date().toISOString(),
    yawAngle: face.yawAngle,
    pitchAngle: face.pitchAngle,
    rollAngle: face.rollAngle,
    leftEyeOpenProbability: face.leftEyeOpenProbability,
    rightEyeOpenProbability: face.rightEyeOpenProbability,
    bounds: {
      x: face.bounds.x,
      y: face.bounds.y,
      width: face.bounds.width,
      height: face.bounds.height,
    },
    frameWidth,
    frameHeight,
  };
}

export function phaseForIndex(index: number, total: number): LivenessFramePhase {
  if (index <= 0) return 'before';
  if (index >= total - 1) return 'after';
  return 'during';
}
