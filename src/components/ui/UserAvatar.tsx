import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';


const SIZES = {
  sm: { outer: 44, inner: 40, font: 16, ring: 2 },
  md: { outer: 60, inner: 56, font: 22, ring: 3 },
  lg: { outer: 96, inner: 88, font: 30, ring: 4 },
  xl: { outer: 116, inner: 108, font: 34, ring: 4 },
} as const;

type SizeKey = keyof typeof SIZES;

type Props = {
  uri?: string | null;
  firstName?: string;
  lastName?: string;
  size?: SizeKey;
  variant?: 'brand' | 'light' | 'hero';
  style?: ViewStyle;
};

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] || '';
  const last = lastName?.trim()?.[0] || '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'PV';
}

export function UserAvatar({
  uri,
  firstName,
  lastName,
  size = 'md',
  variant = 'brand',
  style,
}: Props) {
  const dims = SIZES[size];
  const gradients = useGradients();
  const initials = getInitials(firstName, lastName);
  const hasImage = Boolean(uri?.trim());
  const radius = dims.inner / 2;

  const ringStyle = variant === 'hero'
    ? styles.heroRing
    : variant === 'light'
      ? styles.lightRing
      : styles.brandRing;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dims.outer,
          height: dims.outer,
          borderRadius: dims.outer / 2,
          padding: dims.ring,
        },
        ringStyle,
        style,
      ]}
    >
      {hasImage ? (
        <Image
          source={{ uri: uri!.trim() }}
          style={{
            width: dims.inner,
            height: dims.inner,
            borderRadius: radius,
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          recyclingKey={uri!.trim()}
        />
      ) : (
        <LinearGradient
          colors={
            variant === 'hero'
              ? gradientStops([gradients.logo[0], gradients.logo[2]])
              : gradientStops([gradients.button[0], gradients.button[1]])
          }
          style={{
            width: dims.inner,
            height: dims.inner,
            borderRadius: radius,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[styles.initials, { fontSize: dims.font }]}>{initials}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRing: {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
  lightRing: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  heroRing: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  initials: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
