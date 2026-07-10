import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInsets } from './useKeyboardInsets';

/** Extra ScrollView bottom padding while the keyboard is open on service forms. */
export function useServiceFormKeyboard(basePadding = 40) {
  const insets = useSafeAreaInsets();
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();

  const scrollBottomPadding =
    basePadding + insets.bottom + (keyboardVisible ? keyboardHeight + 16 : 0);

  return { scrollBottomPadding, keyboardVisible, keyboardHeight };
}
