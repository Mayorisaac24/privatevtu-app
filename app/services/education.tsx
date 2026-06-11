import { View, Text, StyleSheet } from 'react-native';
import { ServiceGate } from '../../src/components/ServiceGate';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';
import { SERVICE_CODES } from '../../src/lib/service-availability';
import { Colors, Spacing, Typography } from '../../src/theme';

function EducationScreen() {
  useHardwareBack(navigateBack);

  return (
    <View style={styles.root}>
      <ServiceScreenHeader
        title="Education"
        subtitle="Exam pins and school payments"
        icon="school-outline"
        iconColor={Colors.education}
        iconBg={Colors.educationBg}
        onBack={navigateBack}
      />
      <View style={styles.body}>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.subtitle}>Exam pins and education payments are on the way.</Text>
      </View>
    </View>
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
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.page,
    gap: 8,
  },
  title: { ...Typography.h2, color: Colors.dark },
  subtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
});
