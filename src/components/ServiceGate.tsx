import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { navigateBack } from '../lib/navigation';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';
import { type ServiceCode } from '../lib/service-availability';
import { Colors, Radius, Spacing } from '../theme';

type ServiceGateProps = {
  serviceCode: ServiceCode;
  title: string;
  children: React.ReactNode;
};

export function ServiceGate({ serviceCode, title, children }: ServiceGateProps) {
  const loadedAt = useServiceAvailabilityStore((s) => s.loadedAt);
  const { isUsable } = useServiceAvailability();

  if (!loadedAt) {
    return <>{children}</>;
  }

  if (!isUsable(serviceCode)) {
    return (
      <View style={styles.centered}>
        <View style={styles.iconWrap}>
          <Ionicons name="ban-outline" size={28} color="#D97706" />
        </View>
        <Text style={styles.title}>{title} unavailable</Text>
        <Text style={styles.subtitle}>
          This service is currently disabled. Please check back later or contact support.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateBack()} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    backgroundColor: '#F4F5FA',
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
