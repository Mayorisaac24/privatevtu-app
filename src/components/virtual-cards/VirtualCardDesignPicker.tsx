import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  VIRTUAL_CARD_DESIGNS,
  type VirtualCardDesignId,
} from '../../lib/virtual-card-designs';
import { Colors, Radius, useThemedStyles } from '../../theme';
import { VirtualCardVisual } from './VirtualCardVisual';

export function VirtualCardDesignPicker({
  selected,
  onSelect,
  brand,
  cardName,
  holderName,
  balanceUsd,
}: {
  selected: VirtualCardDesignId;
  onSelect: (designId: VirtualCardDesignId) => void;
  brand: 'VISA' | 'MASTERCARD';
  cardName?: string;
  holderName?: string;
  balanceUsd?: number;
}) {
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Choose your card design</Text>
      <Text style={styles.subtitle}>Premium skins stored on your account — pick one that matches your vibe.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {VIRTUAL_CARD_DESIGNS.map((design) => {
          const active = selected === design.id;
          return (
            <TouchableOpacity
              key={design.id}
              activeOpacity={0.9}
              onPress={() => onSelect(design.id)}
              style={[styles.item, active && styles.itemActive]}
            >
              <VirtualCardVisual
                designId={design.id}
                brand={brand}
                cardName={cardName}
                holderName={holderName}
                balanceUsd={balanceUsd}
                preview
                size="mini"
                showBalance={false}
              />
              <View style={styles.caption}>
                <Text style={[styles.label, active && styles.labelActive]}>{design.label}</Text>
                <Text style={styles.tagline} numberOfLines={1}>{design.tagline}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  row: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 4,
  },
  item: {
    width: 168,
    gap: 8,
    padding: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  caption: {
    gap: 2,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
  },
  labelActive: {
    color: Colors.primary,
  },
  tagline: {
    fontSize: 11,
    color: colors.muted,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
