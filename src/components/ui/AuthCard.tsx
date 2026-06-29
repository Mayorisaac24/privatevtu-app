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
  cardStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  fill?: boolean;
  /** Keeps the white shell fixed; only inner content scrolls. */
  scrollable?: boolean;
  scrollBottomInset?: number;
  keyboardPadding?: number;
};

export function AuthCard({
  children,
  style,
  cardStyle,
  contentStyle,
  footer,
  fill = false,
  scrollable = false,
  scrollBottomInset = 32,
  keyboardPadding = 0,
}: AuthCardProps) {
  const { pagePadding } = useLayout();
  const contentPadding = {
    paddingHorizontal: pagePadding,
    paddingTop: isAndroid ? 12 : 16,
    paddingBottom: isAndroid ? 24 : 20,
  };

  const shellStyle = [styles.card, fill && styles.cardFill, style, cardStyle];

  const body = (
    <ScreenContent centered>
      {children}
      {footer}
    </ScreenContent>
  );

  const bottomPad = Math.max(scrollBottomInset, keyboardPadding, isAndroid ? 24 : 20);

  if (scrollable) {
    return (
      <View style={[shellStyle, styles.cardScrollShell]}>
        <View style={styles.handle} />
        <ScrollView
          style={fill ? styles.scrollFill : styles.scrollInner}
          contentContainerStyle={[
            contentPadding,
            styles.scrollContent,
            { paddingBottom: bottomPad },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces
          nestedScrollEnabled
        >
          {body}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={shellStyle} pointerEvents="auto">
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
    minHeight: 0,
  },
  scrollFill: {
    flex: 1,
  },
  scrollInner: {
    flexGrow: 0,
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
    flexGrow: 0,
  },
});
