import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

export async function optimizeLivenessPhoto(photoPath: string): Promise<string> {
  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 720 } }],
    { compress: 0.58, format: ImageManipulator.SaveFormat.JPEG, base64: true },
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

export async function assertVideoSizeOk(videoPath: string): Promise<string> {
  const uri = videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('Could not read video recording. Please try again.');
  }

  const size = typeof info.size === 'number' ? info.size : 0;
  if (size > MAX_VIDEO_BYTES) {
    throw new Error('Recording is too large. Please try again in good lighting, closer to the camera.');
  }

  return uri;
}

export async function videoToDataUri(videoPath: string): Promise<string> {
  const uri = await assertVideoSizeOk(videoPath);
  const lower = uri.toLowerCase();
  const mime = lower.includes('.mov') ? 'video/quicktime' : 'video/mp4';
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) {
    throw new Error('Could not process video recording. Please try again.');
  }
  return `data:${mime};base64,${base64}`;
}
