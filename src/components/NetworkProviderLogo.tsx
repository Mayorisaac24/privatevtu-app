import { Image, ImageSourcePropType, StyleProp, ImageStyle, StyleSheet, View } from 'react-native';
import type { AirtimeProvider } from '../lib/api';
import { getProviderCode, getProviderLogo, getProviderStyle } from '../lib/providers';

type Props = {
  provider: Pick<AirtimeProvider, 'code' | 'id' | 'imageUrl'>;
  size: number;
  style?: StyleProp<ImageStyle>;
};

const DEFAULT_BRAND = { bg: '#FFFFFF', border: '#E2E8F0', text: '#334155' };

/** Per-provider inset so square/wide assets sit uniformly inside the circular badge. */
const LOGO_INSET_RATIO: Record<string, number> = {
  mtn: 0.08,
  airtel: 0.22,
  glo: 0.04,
  '9mobile': 0.16,
  t2: 0.16,
};

const DEFAULT_INSET = 0.14;

export function NetworkProviderLogo({ provider, size, style }: Props) {
  const code = getProviderCode(provider);
  const brand = getProviderStyle(code, DEFAULT_BRAND);
  const insetRatio = LOGO_INSET_RATIO[code] ?? DEFAULT_INSET;
  const inset = Math.max(2, Math.round(size * insetRatio));
  const imageSize = size - inset * 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: brand.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: brand.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={getProviderLogo(provider) as ImageSourcePropType}
        style={{ width: imageSize, height: imageSize }}
        resizeMode="contain"
      />
    </View>
  );
}
