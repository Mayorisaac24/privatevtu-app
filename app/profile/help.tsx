import { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { api, isResponseSuccess } from '../../src/lib/api';
import { Colors, Radius } from '../../src/theme';

const SUPPORT_EMAIL = 'support@privatevtu.com';

export default function HelpScreen() {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.getContentPage('help').then((res) => {
      if (isResponseSuccess(res) && res.data) {
        setBody(res.data.body);
      }
      setLoading(false);
    });
  }, []);

  return (
    <ProfileSubScreen title="Help & FAQ" subtitle="Answers and support">
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={18} contentStyle={styles.card}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.body}>{body}</Text>
        )}
      </GlassCard>

      <TouchableOpacity
        style={styles.supportBtn}
        onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        activeOpacity={0.85}
      >
        <Ionicons name="mail-outline" size={18} color={Colors.primary} />
        <Text style={styles.supportText}>Email {SUPPORT_EMAIL}</Text>
      </TouchableOpacity>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 180 },
  body: { fontSize: 14, lineHeight: 22, color: Colors.mid },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryMuted,
  },
  supportText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
