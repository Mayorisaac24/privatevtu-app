import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassModal } from './GlassModal';
import { GradientButton } from './GradientButton';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../theme';
import { CTA_BUTTON_HEIGHT } from '../../lib/platform-ui';


type ConfirmDialogProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
};

export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancel',
  icon = 'help-circle-outline',
  loading = false,
}: ConfirmDialogProps) {
  const styles = useStyles();

  return (
    <GlassModal visible={visible} onClose={onClose} align="center" contentStyle={styles.content}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={Colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>

        <GradientButton
          title={confirmLabel}
          onPress={onConfirm}
          disabled={loading}
          isLoading={loading}
          size="compact"
          style={styles.confirmWrap}
        />
      </View>
    </GlassModal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Overlays.darkAmbientPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    minHeight: CTA_BUTTON_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Overlays.rgba15_23_42_01,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  confirmWrap: {
    flex: 1,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
