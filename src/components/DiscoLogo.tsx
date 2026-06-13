import { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { ElectricityProvider } from '../lib/api';
import { getDiscoLogo } from '../lib/disco-providers';
import { Colors } from '../theme';

type Props = {
  provider: Pick<ElectricityProvider, 'code' | 'id' | 'name' | 'imageUrl' | 'updatedAt'>;
  size?: number;
};

export function DiscoLogo({ provider, size = 36 }: Props) {
  const source = useMemo(
    () => getDiscoLogo(provider),
    [provider.code, provider.id, provider.imageUrl, provider.updatedAt],
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [provider.code, provider.imageUrl, provider.updatedAt]);

  const logoSize = size - 6;

  if (failed && typeof source === 'object' && 'uri' in source) {
    const fallback = getDiscoLogo({ ...provider, imageUrl: null });
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={fallback} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        key={`${provider.code}-${provider.imageUrl || ''}-${provider.updatedAt || ''}`}
        source={source}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
