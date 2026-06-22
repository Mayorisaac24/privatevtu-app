import { useCallback, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { api, isResponseSuccess } from '../lib/api';
import { useAuthStore } from '../stores';
import { showToast } from '../components/ui/Toast';

export function useAvatarPicker() {
  const { setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const pickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: 'error', text1: 'Permission needed', text2: 'Allow photo access to update your photo' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    try {
      const asset = result.assets[0];

      let finalBase64 = asset.base64;
      let mime = asset.mimeType || 'image/jpeg';

      if (!finalBase64 || (asset.width ?? 0) > 1600 || (asset.height ?? 0) > 1600) {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        finalBase64 = manipulated.base64 ?? finalBase64;
        mime = 'image/jpeg';
      }

      if (!finalBase64) {
        throw new Error('Could not process selected photo. Please try another image.');
      }

      const dataUri = `data:${mime};base64,${finalBase64}`;
      const uploadRes = await api.uploadAvatar(dataUri);
      if (!isResponseSuccess(uploadRes) || !uploadRes.data?.url) {
        throw new Error(uploadRes.message || 'Upload failed');
      }

      const profileRes = await api.updateProfile({ avatar: uploadRes.data.url });
      if (!isResponseSuccess(profileRes) || !profileRes.data) {
        throw new Error(profileRes.message || 'Could not save photo');
      }

      setUser(profileRes.data);
      showToast({ type: 'success', text1: 'Photo updated', text2: 'Your profile photo is now synced across devices' });
    } catch (error: unknown) {
      let message = error instanceof Error ? error.message : 'Could not update photo';
      const lower = message.toLowerCase();
      if (lower.includes('body') && (lower.includes('too big') || lower.includes('too large'))) {
        message = 'Photo is too large. Please pick a smaller image and try again.';
      }
      showToast({ type: 'error', text1: 'Update failed', text2: message });
    } finally {
      setUploading(false);
    }
  }, [setUser]);

  return { pickAvatar, uploading };
}
