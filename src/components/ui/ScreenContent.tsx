import { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayout } from '../../lib/platform-ui';

type ScreenContentProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true, applies responsive horizontal padding. Default false — shells already pad. */
  padded?: boolean;
  /** Stretch to full width on phones; center column on tablets. */
  centered?: boolean;
};

/**
 * Centers app content on tablets and large phones while keeping phone layouts unchanged.
 * Wrap screen body content (inside ScrollView) for consistent cross-device layout.
 */
export function ScreenContent({
  children,
  style,
  padded = false,
  centered = true,
}: ScreenContentProps) {
  const { isTablet, contentMaxWidth, pagePadding } = useLayout();

  return (
    <View
      style={[
        { width: '100%' },
        centered && isTablet && {
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        },
        padded && { paddingHorizontal: pagePadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}
