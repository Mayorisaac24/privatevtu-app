import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Bank } from './api';
import { parseTransferDetailsFromText, type TransferOcrResult } from './transfer-ocr';

type ScanSource = 'camera' | 'library';

async function requestPermissions(source: ScanSource): Promise<boolean> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

async function pickImage(source: ScanSource): Promise<string | null> {
  const allowed = await requestPermissions(source);
  if (!allowed) {
    throw new Error(source === 'camera'
      ? 'Camera access is required to scan account details'
      : 'Photo library access is required to scan account details');
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    })
    : await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

async function recognizeTextFromUri(_uri: string): Promise<string> {
  throw new Error('Account scanning is temporarily unavailable in this build.');
}

export async function scanTransferDetails(
  banks: Bank[],
  source: ScanSource,
): Promise<TransferOcrResult | null> {
  const uri = await pickImage(source);
  if (!uri) return null;

  const rawText = await recognizeTextFromUri(uri);
  if (!rawText.trim()) {
    throw new Error('No text found in the image. Try a clearer photo.');
  }

  return parseTransferDetailsFromText(rawText, banks);
}

export function promptTransferScanSource(): Promise<ScanSource | null> {
  return new Promise((resolve) => {
    const options = ['Take photo', 'Choose from gallery', 'Cancel'];
    const cancelIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          title: 'Scan account details',
          message: 'Capture or select a photo showing the account number and bank name.',
        },
        (index: number) => {
          if (index === 0) resolve('camera');
          else if (index === 1) resolve('library');
          else resolve(null);
        },
      );
      return;
    }

    Alert.alert(
      'Scan account details',
      'Capture or select a photo showing the account number and bank name.',
      [
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Choose from gallery', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
