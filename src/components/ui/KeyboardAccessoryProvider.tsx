import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NUMERIC_KEYBOARD_ACCESSORY_ID } from '../../lib/keyboard-accessory';
import { isIOS } from '../../lib/platform-ui';
import { useThemedStyles } from '../../theme';

type AccessoryConfig = {
  nextLabel?: string;
  onNext?: () => void;
};

type KeyboardAccessoryContextValue = {
  setAccessory: (config: AccessoryConfig | null) => void;
};

const KeyboardAccessoryContext = createContext<KeyboardAccessoryContextValue>({
  setAccessory: () => {},
});

/** Register optional Next action while a field is focused. */
export function useKeyboardAccessoryFocus() {
  const { setAccessory } = useContext(KeyboardAccessoryContext);

  const register = useCallback(
    (config: AccessoryConfig | null) => {
      setAccessory(config);
    },
    [setAccessory],
  );

  const clear = useCallback(() => {
    setAccessory(null);
  }, [setAccessory]);

  return { register, clear };
}

/** Props for number-pad / phone-pad TextInputs on service forms. */
export function useNumericInputAccessory(options?: {
  onAccessoryNext?: () => void;
  accessoryNextLabel?: string;
}): Pick<TextInputProps, 'inputAccessoryViewID' | 'returnKeyType' | 'blurOnSubmit' | 'onSubmitEditing' | 'onFocus' | 'onBlur'> {
  const { register, clear } = useKeyboardAccessoryFocus();
  const blurClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFocus = useCallback(() => {
    if (blurClearTimer.current) {
      clearTimeout(blurClearTimer.current);
      blurClearTimer.current = null;
    }
    if (options?.onAccessoryNext) {
      register({
        onNext: options.onAccessoryNext,
        nextLabel: options.accessoryNextLabel,
      });
    } else {
      clear();
    }
  }, [clear, options?.accessoryNext, options?.accessoryNextLabel, register]);

  const onBlur = useCallback(() => {
    blurClearTimer.current = setTimeout(() => {
      clear();
      blurClearTimer.current = null;
    }, 120);
  }, [clear]);

  if (Platform.OS === 'android') {
    return {
      returnKeyType: 'done',
      blurOnSubmit: true,
      onSubmitEditing: () => Keyboard.dismiss(),
      onFocus,
      onBlur,
    };
  }

  return {
    inputAccessoryViewID: NUMERIC_KEYBOARD_ACCESSORY_ID,
    onFocus,
    onBlur,
  };
}

function NumberPadAccessoryBar({
  nextLabel = 'Next',
  onNext,
}: AccessoryConfig) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.leading}>
        {onNext ? (
          <TouchableOpacity
            onPress={onNext}
            style={styles.actionBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.nextText}>{nextLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => Keyboard.dismiss()}
        style={styles.doneBtn}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

export function KeyboardAccessoryProvider({ children }: { children: ReactNode }) {
  const [accessory, setAccessoryState] = useState<AccessoryConfig | null>(null);

  const setAccessory = useCallback((config: AccessoryConfig | null) => {
    setAccessoryState(config);
  }, []);

  const value = useMemo(() => ({ setAccessory }), [setAccessory]);

  return (
    <KeyboardAccessoryContext.Provider value={value}>
      {children}
      {isIOS ? (
        <InputAccessoryView nativeID={NUMERIC_KEYBOARD_ACCESSORY_ID}>
          <NumberPadAccessoryBar nextLabel={accessory?.nextLabel} onNext={accessory?.onNext} />
        </InputAccessoryView>
      ) : null}
    </KeyboardAccessoryContext.Provider>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    leading: {
      minWidth: 64,
    },
    actionBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    nextText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    doneBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    doneText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
