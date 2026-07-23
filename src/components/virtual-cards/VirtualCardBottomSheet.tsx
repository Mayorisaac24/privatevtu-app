import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../theme';
import { useKeyboardInsets } from '../../hooks/useKeyboardInsets';

type VirtualCardBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Lift sheet content when the keyboard is open (fund / text inputs). */
  keyboardAvoiding?: boolean;
};

export function VirtualCardBottomSheet({
  visible,
  onClose,
  children,
  scroll = true,
  contentStyle,
  refreshControl,
  keyboardAvoiding = false,
}: VirtualCardBottomSheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();
  const keyboardPad = keyboardAvoiding && keyboardVisible ? keyboardHeight + 12 : 0;

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={keyboardAvoiding}
      contentContainerStyle={[
        styles.scrollContent,
        contentStyle,
        { paddingBottom: insets.bottom + 16 + keyboardPad },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.scrollContent,
        contentStyle,
        { paddingBottom: insets.bottom + 16 + keyboardPad },
      ]}
    >
      {children}
    </View>
  );

  const sheet = (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {body}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        sheet
      )}
    </Modal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,25,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
