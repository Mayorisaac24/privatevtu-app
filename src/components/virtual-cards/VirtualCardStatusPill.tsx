import { Text, StyleSheet, View } from 'react-native';
import { Colors, useThemedStyles } from '../../theme';
import { virtualCardStatusMeta } from '../../lib/virtual-card-utils';

export function VirtualCardStatusPill({ status }: { status: string }) {
  const styles = useStyles();
  const meta = virtualCardStatusMeta(status);
  const softBg = status.toUpperCase() === 'ACTIVE'
    ? `${Colors.success}18`
    : status.toUpperCase() === 'FROZEN'
      ? `${Colors.warning}20`
      : status.toUpperCase() === 'TERMINATED'
        ? `${Colors.error}14`
        : `${meta.color}18`;

  return (
    <View style={[styles.pill, { backgroundColor: softBg }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const createStyles = (_colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
