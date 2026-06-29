import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BettingPlatform } from '../lib/api';
import { Colors } from '../theme';

type Props = {
  platform: Pick<BettingPlatform, 'name' | 'imageUrl' | 'code'>;
  size?: number;
};

export function BettingPlatformLogo({ platform, size = 36 }: Props) {
  const [failed, setFailed] = useState(false);
  const imageUrl = platform.imageUrl?.trim() || '';

  useEffect(() => {
    setFailed(false);
  }, [platform.code, imageUrl]);

  const logoSize = size - 8;

  if (!imageUrl || failed) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 4 }]}>
        <Ionicons name="trophy-outline" size={Math.round(size * 0.42)} color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 4 }]}>
      <Image
        key={`${platform.code}-${imageUrl}`}
        source={{ uri: imageUrl }}
        style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 5 }}
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
