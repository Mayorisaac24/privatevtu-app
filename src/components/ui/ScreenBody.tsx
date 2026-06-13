import { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayout } from '../../lib/platform-ui';
import { ScreenContent } from './ScreenContent';

type ScreenBodyProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Apply responsive horizontal padding around content. */
  padded?: boolean;
};

/**
 * Standard responsive body wrapper for tab screens and stack scroll areas.
 * Centers content on tablets; keeps phone layout intact.
 */
export function ScreenBody({ children, style, padded = true }: ScreenBodyProps) {
  const { pagePadding } = useLayout();

  return (
    <View style={[padded ? { paddingHorizontal: pagePadding } : null, style]}>
      <ScreenContent centered>{children}</ScreenContent>
    </View>
  );
}
