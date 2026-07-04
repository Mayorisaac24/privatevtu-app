import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { FundingBank } from '../lib/api';
import { enrichBankLogo, getBankLogoUri } from '../lib/funding-banks';
import { BankBrandColors } from '../theme/colors/app-colors';
import {Colors, Overlays, useColors, useThemedStyles } from '../theme';

const BRAND_COLORS = BankBrandColors;

type Props = {
  bank: Pick<FundingBank, 'code' | 'name' | 'shortName' | 'logoUrl' | 'logoVersion'>;
  size?: number;
};

function resolveBrand(code: string) {
  return BRAND_COLORS[code]
    || BRAND_COLORS[code.replace(/^0+/, '')]
    || BRAND_COLORS[code.padStart(6, '0')];
}

function BrandedFallback({ code, size }: { code: string; size: number }) {
  const styles = useStyles();
  const colors = useColors();

  const brand = resolveBrand(code) ?? { bg: colors.borderMid, fg: Colors.mid, label: '?' };
  const fontSize = Math.max(10, size * 0.34);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 4, backgroundColor: brand.bg }]}>
      <Text style={{ color: brand.fg, fontSize, fontWeight: '800' }}>{brand.label}</Text>
    </View>
  );
}

export function BankLogo({ bank, size = 36 }: Props) {
  const styles = useStyles();

  const enriched = useMemo(
    () => enrichBankLogo({
      ...bank,
      name: bank.name || bank.shortName || String(bank.code),
    } as FundingBank),
    [bank.code, bank.logoUrl, bank.logoVersion, bank.name, bank.shortName],
  );
  const uri = getBankLogoUri(enriched);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return <BrandedFallback code={enriched.code} size={size} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 4 }]}>
      <Image
        source={{ uri }}
        style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 5 }}
        contentFit="contain"
        transition={120}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
