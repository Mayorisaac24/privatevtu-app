import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import {Colors, Radius, useThemedStyles } from '../../theme';

interface PinInputProps {
  value: string;
  length?: number;
  onFocus?: () => void;
}

export function PinDots({ value, length = 4 }: PinInputProps) {
  const styles = useStyles();

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < value.length ? styles.dotFilled : null]}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  dotsRow: { flexDirection: 'row', gap: 18, justifyContent: 'center' },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.borderMid,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
