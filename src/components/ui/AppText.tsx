import { Text, type TextProps, type TextStyle, type StyleProp } from 'react-native';
import { Typography } from '../../theme';
import { textStyle } from '../../lib/platform-ui';

type TypographyVariant = keyof typeof Typography;

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant,
  weight,
  color,
  style,
  children,
  ...props
}: AppTextProps) {
  const base = variant ? Typography[variant] : undefined;
  const merged = textStyle({
    ...(base ?? {}),
    ...(weight ? { fontWeight: weight } : null),
    ...(color ? { color } : null),
  });

  return (
    <Text {...props} style={[merged, style]}>
      {children}
    </Text>
  );
}
