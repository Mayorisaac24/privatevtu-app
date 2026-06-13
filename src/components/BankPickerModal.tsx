import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FundingBank } from '../lib/api';
import { getBankDisplayName } from '../lib/funding-banks';
import { BankLogo } from './BankLogo';
import { Colors } from '../theme';
import { GlassModal } from './ui/GlassModal';


type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  banks: FundingBank[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (bank: FundingBank) => void;
};

export function BankPickerModal({
  visible,
  title,
  subtitle,
  banks,
  loading = false,
  onClose,
  onSelect,
}: Props) {
  return (
    <GlassModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={Colors.muted} />
        </TouchableOpacity>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.list}>
          {banks.map((bank) => (
            <TouchableOpacity
              key={bank.code}
              style={styles.bankRow}
              onPress={() => onSelect(bank)}
              activeOpacity={0.82}
            >
              <BankLogo bank={bank} size={44} />
              <View style={styles.bankText}>
                <Text style={styles.bankName}>{getBankDisplayName(bank)}</Text>
                <Text style={styles.bankCode}>Bank code {bank.code}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  subtitle: { fontSize: 13, color: Colors.muted, lineHeight: 19 },
  loadingWrap: { paddingVertical: 28, alignItems: 'center' },
  list: { gap: 10, marginTop: 4 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bankText: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  bankCode: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
