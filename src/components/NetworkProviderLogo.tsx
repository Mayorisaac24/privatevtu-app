import { Image, ImageSourcePropType, StyleProp, View, ViewStyle } from 'react-native';
import type { AirtimeProvider } from '../lib/api';
import { getProviderCode, getProviderLogo } from '../lib/providers';

type Props = {
  provider: Pick<AirtimeProvider, 'code' | 'id' | 'imageUrl'>;
  size: number;
  style?: StyleProp<ViewStyle>;
};

type LogoConfig = {
  scale: number;
  /** Fills transparent padding in non-square assets. */
  bg?: string;
};

const LOGO_CONFIG: Record<string, LogoConfig> = {
  mtn: { scale: 1 },
  airtel: { scale: 1.5 },
  glo: { scale: 1.18, bg: '#008752' },
  '9mobile': { scale: 1.22, bg: '#00A651' },
  t2: { scale: 1.14, bg: '#F97316' },
};

const DEFAULT_CONFIG: LogoConfig = { scale: 1 };

export function NetworkProviderLogo({ provider, size, style }: Props) {
  const code = getProviderCode(provider);
  const { scale, bg } = LOGO_CONFIG[code] ?? DEFAULT_CONFIG;
  const dimension = size * scale;
  const offset = (size - dimension) / 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Image
        source={getProviderLogo(provider) as ImageSourcePropType}
        style={{
          width: dimension,
          height: dimension,
          marginLeft: offset,
          marginTop: offset,
        }}
        resizeMode="cover"
      />
    </View>
  );
}
