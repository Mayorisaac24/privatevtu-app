import { useEffect, useMemo, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EducationProvider } from '../lib/api';
import {
  getEducationProviderCode,
  getEducationProviderLogo,
  getEducationProviderShortName,
  getEducationProviderStyle,
} from '../lib/education-providers';
import { Colors } from '../theme';

type Props = {
  provider: Pick<EducationProvider, 'code' | 'id' | 'name' | 'displayName' | 'imageUrl'>;
  size?: number;
};

export function EducationProviderLogo({ provider, size = 36 }: Props) {
  const code = getEducationProviderCode(provider);
  const style = getEducationProviderStyle(code, {
    bg: Colors.surface,
    border: Colors.borderMid,
    text: Colors.mid,
  });
  const remoteSource = useMemo(() => getEducationProviderLogo(provider), [provider.code, provider.id, provider.imageUrl]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [provider.code, provider.imageUrl]);

  const logoSize = size * 0.68;
  const monogram = getEducationProviderShortName(provider).slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: style.bg,
          borderColor: style.border,
        },
      ]}
    >
      {remoteSource && !failed ? (
        <Image
          key={`${provider.code}-${provider.imageUrl || ''}`}
          source={remoteSource}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : monogram.length >= 2 ? (
        <Text style={[styles.monogram, { color: style.text, fontSize: size * 0.28 }]}>{monogram}</Text>
      ) : (
        <Ionicons name="school-outline" size={size * 0.38} color={style.text} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  monogram: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
