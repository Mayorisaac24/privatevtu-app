import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type KeyboardDismissViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Tap empty space to dismiss the software keyboard without blocking child controls. */
export function KeyboardDismissView({ children, style }: KeyboardDismissViewProps) {
  return (
    <Pressable
      style={[styles.root, style]}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
