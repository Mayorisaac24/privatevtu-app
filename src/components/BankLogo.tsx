import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { FundingBank } from '../lib/api';
import { enrichBankLogo, getBankLogoUri } from '../lib/funding-banks';
import { Colors } from '../theme';

const BRAND_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  '999991': { bg: '#7C3AED', fg: '#FFFFFF', label: 'PP' },
  '120001': { bg: '#1D4ED8', fg: '#FFFFFF', label: '9' },
  '090175': { bg: '#DC2626', fg: '#FFFFFF', label: 'R' },
  '999992': { bg: '#16A34A', fg: '#FFFFFF', label: 'OP' },
  '000058': { bg: '#F58220', fg: '#FFFFFF', label: 'GT' },
  '000033': { bg: '#D32F2F', fg: '#FFFFFF', label: 'UB' },
  '000057': { bg: '#E11D48', fg: '#FFFFFF', label: 'ZE' },
  '000044': { bg: '#F97316', fg: '#FFFFFF', label: 'AC' },
  '000011': { bg: '#1D4ED8', fg: '#FFFFFF', label: 'FB' },
  '000214': { bg: '#7C3AED', fg: '#FFFFFF', label: 'FC' },
  '000035': { bg: '#7C3AED', fg: '#FFFFFF', label: 'WE' },
  '000232': { bg: '#DC2626', fg: '#FFFFFF', label: 'ST' },
  '000070': { bg: '#0284C7', fg: '#FFFFFF', label: 'FD' },
  '000032': { bg: '#0369A1', fg: '#FFFFFF', label: 'UN' },
  '000221': { bg: '#0F766E', fg: '#FFFFFF', label: 'SB' },
  '090405': { bg: '#2563EB', fg: '#FFFFFF', label: 'MP' },
  '090267': { bg: '#7C3AED', fg: '#FFFFFF', label: 'KD' },
};

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
  const brand = resolveBrand(code) ?? { bg: '#E2E8F0', fg: Colors.mid, label: '?' };
  const fontSize = Math.max(10, size * 0.34);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 4, backgroundColor: brand.bg }]}>
      <Text style={{ color: brand.fg, fontSize, fontWeight: '800' }}>{brand.label}</Text>
    </View>
  );
}

export function BankLogo({ bank, size = 36 }: Props) {
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

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
