import { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { api, isResponseSuccess } from '../../src/lib/api';
import { Colors, Radius } from '../../src/theme';


export default function PrivacyPolicyScreen() {
  const [title, setTitle] = useState('Privacy Policy');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.getContentPage('privacy').then((res) => {
      if (isResponseSuccess(res) && res.data) {
        setTitle(res.data.title);
        setBody(res.data.body);
      }
      setLoading(false);
    });
  }, []);

  return (
    <ProfileSubScreen title={title} subtitle="How we protect your data">
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={18} contentStyle={styles.card}>
        {loading ? (
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
  body: { fontSize: 14, lineHeight: 22, color: Colors.mid },
});
