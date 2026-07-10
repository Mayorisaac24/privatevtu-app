import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useServiceFormKeyboard } from '../../hooks/useServiceFormKeyboard';
import { isIOS } from '../../lib/platform-ui';

type ServicePurchaseScrollProps = ScrollViewProps & {
  children: ReactNode;
  baseBottomPadding?: number;
  avoidingStyle?: StyleProp<ViewStyle>;
};

/**
 * Scroll container for multi-field service purchase forms.
 * Keeps lower fields (amount, plans) reachable while the keyboard is open.
 */
export function ServicePurchaseScroll({
  children,
  contentContainerStyle,
  baseBottomPadding = 40,
  avoidingStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode,
  showsVerticalScrollIndicator = false,
  ...rest
}: ServicePurchaseScrollProps) {
  const { scrollBottomPadding } = useServiceFormKeyboard(baseBottomPadding);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, avoidingStyle]}
      behavior={isIOS ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        {...rest}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={
          keyboardDismissMode ?? (isIOS ? 'interactive' : 'on-drag')
        }
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[
          { paddingBottom: scrollBottomPadding },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
