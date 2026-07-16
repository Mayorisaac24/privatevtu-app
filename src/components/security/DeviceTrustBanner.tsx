import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildDeviceIntegrityPayload,
  isDeviceCompromised,
  type DeviceIntegrityPayload,
} from '../../lib/device-integrity';
import { Spacing, useColors, useThemedStyles } from '../../theme';

export function DeviceTrustBanner() {
  const colors = useColors();
  const styles = useStyles();
  const [payload, setPayload] = useState<DeviceIntegrityPayload | null>(null);

  useEffect(() => {
    void buildDeviceIntegrityPayload()
      .then(setPayload)
      .catch(() => setPayload(null));
  }, []);

  if (!payload || !isDeviceCompromised(payload)) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="shield-outline" size={18} color={colors.warningDark} />
      <Text style={styles.text}>
        For your security, wallet funding, transfers, and purchases may be limited on this device.
        Use the official app on a standard phone, or contact support if you need help.
      </Text>
    </View>
  );
}

function useStyles() {
  return useThemedStyles((colors) => StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      padding: Spacing.md,
      borderRadius: 12,
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    text: {
      flex: 1,
      color: colors.warningDark,
      fontSize: 13,
      lineHeight: 18,
    },
  }));
}
