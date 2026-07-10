import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, useThemedStyles } from '../../theme';

type Props = {
  label: string;
  summary?: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  headerRight?: ReactNode;
  children?: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function CollapsibleSavedSection({
  label,
  summary,
  count = 0,
  expanded,
  onToggle,
  headerRight,
  children,
  icon = 'bookmark-outline',
}: Props) {
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <View style={[styles.toggleRow, expanded && styles.toggleExpanded]}>
        <TouchableOpacity
          style={styles.toggleMain}
          onPress={onToggle}
          activeOpacity={0.82}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={14} color={Colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>{label}</Text>
            {summary ? (
              <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
            ) : count > 0 ? (
              <Text style={styles.summary}>{count} saved</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.toggleActions}>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            activeOpacity={0.7}
            style={styles.chevronBtn}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    wrap: {
      marginTop: 12,
      gap: 8,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    toggleExpanded: {
      borderColor: colors.primary + '44',
      backgroundColor: colors.inputFilled,
    },
    toggleMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 0,
    },
    toggleActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 10,
      gap: 4,
    },
    chevronBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
      gap: 1,
      minWidth: 0,
    },
    label: {
      ...Typography.captionMed,
      color: colors.dark,
      fontWeight: '700',
    },
    summary: {
      ...Typography.caption,
      color: colors.muted,
      fontSize: 11,
    },
    headerRight: {
      paddingRight: 2,
    },
    body: {
      gap: 8,
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
