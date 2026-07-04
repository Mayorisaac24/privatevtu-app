import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BettingPlatform } from '../lib/api';
import {Colors , Overlays, useThemedStyles } from '../theme';

type Props = {
  platform: Pick<BettingPlatform, 'name' | 'imageUrl' | 'code'>;
  size?: number;
};

export function BettingPlatformLogo({ platform, size = 36 }: Props) {
  const styles = useStyles();

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

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.borderPrimary18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
