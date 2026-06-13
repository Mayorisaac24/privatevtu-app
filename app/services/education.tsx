import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ServiceGate } from '../../src/components/ServiceGate';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';
import { SERVICE_CODES } from '../../src/lib/service-availability';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { ServicePurchaseCard } from '../../src/components/purchase/ServicePurchaseUi';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';

function EducationScreen() {
  useHardwareBack(navigateBack);
  const gradients = useGradients();

  return (
    <ThemedScreen>
      <ServiceScreenHeader
        title="Education"
        subtitle="Exam pins and school payments"
        icon="school-outline"
        onBack={navigateBack}
      />
      <View style={styles.body}>
        <ServicePurchaseCard style={styles.card}>
          <LinearGradient colors={gradientStops(gradients.primary)} style={styles.iconWrap}>
            <Ionicons name="school-outline" size={28} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.title}>Coming soon</Text>
          <Text style={styles.subtitle}>Exam pins and education payments are on the way.</Text>
        </ServicePurchaseCard>
      </View>
    </ThemedScreen>
  );
}

export default function EducationRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.education} title="Education">
      <EducationScreen />
    </ServiceGate>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.page,
  },
  card: {
    alignItems: 'center',
    width: '100%',
    gap: 10,
    paddingVertical: 32,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { ...Typography.h2, color: Colors.dark },
  subtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
});
