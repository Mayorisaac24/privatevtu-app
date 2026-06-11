import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FundingBank } from '../lib/api';
import { getBankDisplayName } from '../lib/funding-banks';
import { BankLogo } from './BankLogo';
import { Colors } from '../theme';

const BRAND = '#7C3AED';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : (
            <View style={styles.list}>
              {banks.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  style={styles.bankRow}
                  onPress={() => onSelect(bank)}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  subtitle: { fontSize: 13, color: Colors.muted, lineHeight: 19 },
  loadingWrap: { paddingVertical: 28, alignItems: 'center' },
  list: { gap: 10, marginTop: 4 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  bankText: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  bankCode: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
