import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useSupportContent } from '../../src/hooks/useSupportContent';
import { Colors, Radius } from '../../src/theme';

export default function TermsScreen() {
  const { page, loading } = useSupportContent('terms');
  const title = page.title || 'Terms of Service';
  const body = page.body;

  return (
    <ProfileSubScreen title={title} subtitle="Usage agreement" headerIcon="document-text-outline">
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={18} contentStyle={styles.card}>
        {loading && !body ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.body}>{body}</Text>
        )}
      </GlassCard>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 200 },
  body: { fontSize: 14, lineHeight: 24, color: Colors.mid },
});
