import { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, Shadow } from '../../theme';
import { isAndroid, useLayout } from '../../lib/platform-ui';
import { ScreenContent } from './ScreenContent';

type AuthCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  fill?: boolean;
  /** Keeps the white shell fixed; only inner content scrolls. */
  scrollable?: boolean;
  scrollBottomInset?: number;
};

export function AuthCard({
  children,
  style,
  contentStyle,
  footer,
  fill = false,
  scrollable = false,
  scrollBottomInset = 32,
}: AuthCardProps) {
  const { pagePadding } = useLayout();
  const contentPadding = {
    paddingHorizontal: pagePadding,
    paddingTop: isAndroid ? 12 : 16,
    paddingBottom: isAndroid ? 48 : 40,
  };

  const body = (
    <ScreenContent centered>
      {children}
      {footer}
    </ScreenContent>
  );

  if (scrollable) {
    return (
      <View style={[styles.card, styles.cardScrollShell, fill && styles.cardFill, style]}>
        <View style={styles.handle} />
        <ScrollView
          style={styles.scrollInner}
          contentContainerStyle={[
            contentPadding,
            styles.scrollContent,
            { paddingBottom: Math.max(scrollBottomInset, isAndroid ? 48 : 32) },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
        >
          {body}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.card, fill && styles.cardFill, style]}>
      <View style={styles.handle} />
      <View style={[contentPadding, contentStyle]}>
        {body}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Shadow.lg,
  },
  cardFill: {
    flex: 1,
  },
  cardScrollShell: {
    flex: 1,
  },
  scrollInner: {
    flex: 1,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMid,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.4,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: isAndroid ? '100%' : undefined,
  },
});
