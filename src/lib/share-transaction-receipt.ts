import * as FileSystem from 'expo-file-system';
import type { RefObject } from 'react';
import { TurboModuleRegistry } from 'react-native';
import type { View } from 'react-native';
import { buildReceiptHtml, type ReceiptTheme } from './receipt-html';
import { sanitizeReceiptFilename, type TransactionReceiptData } from './transaction-receipt';

const NATIVE_MODULE_HINT = 'Rebuild the app to enable image sharing: npx expo run:ios --device';

export class ViewShotUnavailableError extends Error {
  constructor() {
    super('VIEW_SHOT_UNAVAILABLE');
    this.name = 'ViewShotUnavailableError';
  }
}

export function isViewShotNativeAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNViewShot') != null;
  } catch {
    return false;
  }
}

function isViewShotRuntimeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('RNViewShot')
    || message.includes('TurboModuleRegistry.getEnforcing')
    || message.includes('VIEW_SHOT_UNAVAILABLE')
  );
}

async function loadPrintModule() {
  try {
    return await import('expo-print');
  } catch {
    throw new Error(`PDF sharing is not available. ${NATIVE_MODULE_HINT}`);
  }
}

async function loadSharingModule() {
  try {
    return await import('expo-sharing');
  } catch {
    throw new Error(`File sharing is not available. ${NATIVE_MODULE_HINT}`);
  }
}

async function loadViewShotModule() {
  if (!isViewShotNativeAvailable()) {
    throw new ViewShotUnavailableError();
  }

  try {
    return await import('react-native-view-shot');
  } catch {
    throw new ViewShotUnavailableError();
  }
}

async function shareFile(uri: string, mimeType: string): Promise<void> {
  const Sharing = await loadSharingModule();
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Share transaction receipt',
    UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.png',
  });
}

export async function shareReceiptAsPdf(
  data: TransactionReceiptData,
  theme: ReceiptTheme,
): Promise<void> {
  const Print = await loadPrintModule();
  const html = buildReceiptHtml(data, theme);
  const { uri } = await Print.printToFileAsync({ html });
  const filename = `receipt-${sanitizeReceiptFilename(data.reference)}.pdf`;
  const target = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  await shareFile(target, 'application/pdf');
}

export async function shareReceiptAsImage(
  viewRef: RefObject<View | null>,
  reference: string,
): Promise<void> {
  if (!viewRef.current) {
    throw new Error('Receipt preview is not ready');
  }

  try {
    const { captureRef } = await loadViewShotModule();
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const filename = `receipt-${sanitizeReceiptFilename(reference)}.png`;
    const target = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: target });
    await shareFile(target, 'image/png');
  } catch (error) {
    if (isViewShotRuntimeError(error)) {
      throw new ViewShotUnavailableError();
    }
    throw error;
  }
}

export async function shareReceiptAsImageOrPdfFallback(
  viewRef: RefObject<View | null>,
  data: TransactionReceiptData,
  theme: ReceiptTheme,
): Promise<'image' | 'pdf'> {
  if (!isViewShotNativeAvailable()) {
    await shareReceiptAsPdf(data, theme);
    return 'pdf';
  }

  try {
    await shareReceiptAsImage(viewRef, data.reference);
    return 'image';
  } catch (error) {
    if (isViewShotRuntimeError(error)) {
      await shareReceiptAsPdf(data, theme);
      return 'pdf';
    }
    throw error;
  }
}
