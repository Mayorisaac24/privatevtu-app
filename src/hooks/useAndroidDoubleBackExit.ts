import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { showToast, type ShowToastOptions } from '../components/ui/Toast';

const DEFAULT_EXIT_PROMPT_MS = 2800;

/**
 * Android root back / edge swipe: first press shows a toast, second press (while
 * the toast window is active) exits the app.
 */
export function useAndroidDoubleBackExit(
  enabled: boolean,
  toast: Pick<ShowToastOptions, 'text1' | 'text2' | 'visibilityTime'>,
): void {
  const promptActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTime = toast.visibilityTime ?? DEFAULT_EXIT_PROMPT_MS;

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) {
      promptActiveRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const clearPrompt = () => {
      promptActiveRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (promptActiveRef.current) {
        clearPrompt();
        BackHandler.exitApp();
        return true;
      }

      promptActiveRef.current = true;
      showToast({
        type: 'info',
        text1: toast.text1,
        text2: toast.text2,
        visibilityTime,
      });
      timerRef.current = setTimeout(clearPrompt, visibilityTime);
      return true;
    });

    return () => {
      subscription.remove();
      clearPrompt();
    };
  }, [enabled, toast.text1, toast.text2, visibilityTime]);
}
