import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useSupportConfig } from '../../src/hooks/useSupportContent';
import { Colors, Radius } from '../../src/theme';

type Channel = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action: () => void;
  accent: string;
};

export default function ContactSupportScreen() {
  const { config } = useSupportConfig();

  const email = config?.supportEmail || 'help@privatevtu.app';

  const channels: Channel[] = [
    {
      key: 'dispute',
      icon: 'document-text-outline',
      title: 'Open a dispute',
      subtitle: 'Report a transaction issue with tracking',
      accent: '#7C3AED',
      action: () => router.push('/profile/disputes/new'),
    },
    {
      key: 'email',
      icon: 'mail-outline',
      title: 'Email support',
      subtitle: email,
      accent: '#2563EB',
      action: () => void Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(`${config?.appName || 'Datamart'} Support`)}`),
    },
    ...(config?.supportWhatsapp
      ? [{
        key: 'whatsapp',
        icon: 'logo-whatsapp' as const,
        title: 'WhatsApp',
        subtitle: 'Chat with our team',
        accent: '#16A34A',
        action: () => void Linking.openURL(`https://wa.me/${config.supportWhatsapp?.replace(/\D/g, '')}`),
      }]
      : []),
    ...(config?.supportPhone
      ? [{
        key: 'phone',
        icon: 'call-outline' as const,
        title: 'Phone',
        subtitle: config.supportPhone,
        accent: '#059669',
        action: () => void Linking.openURL(`tel:${config.supportPhone}`),
      }]
      : []),
    {
      key: 'faq',
      icon: 'help-circle-outline',
      title: 'Browse FAQ',
      subtitle: 'Instant answers to common questions',
      accent: '#D97706',
      action: () => router.push('/profile/help'),
    },
  ];

  return (
    <ProfileSubScreen title="Contact Support" subtitle="We're here to help" headerIcon="chatbubbles-outline">
      <GlassCard variant="tinted" borderRadius={Radius.xl} padding={18} contentStyle={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="headset" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSub}>
          For transaction issues, open a dispute so our team can investigate with your receipt attached automatically.
        </Text>
      </GlassCard>

      <View style={styles.channels}>
        {channels.map((channel) => (
          <TouchableOpacity key={channel.key} activeOpacity={0.85} onPress={channel.action}>
            <GlassCard variant="light" borderRadius={Radius.lg} padding={14} contentStyle={styles.channelRow}>
              <View style={[styles.channelIcon, { backgroundColor: `${channel.accent}18` }]}>
                <Ionicons name={channel.icon} size={20} color={channel.accent} />
              </View>
              <View style={styles.channelBody}>
                <Text style={styles.channelTitle}>{channel.title}</Text>
                <Text style={styles.channelSub} numberOfLines={2}>{channel.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footerNote}>
        Typical response time: within 24 hours on business days. Disputes linked to a transaction are reviewed first.
      </Text>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  heroSub: { fontSize: 13, lineHeight: 20, color: Colors.muted, textAlign: 'center' },
  channels: { gap: 10, marginTop: 4 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBody: { flex: 1, gap: 2 },
  channelTitle: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  channelSub: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.mutedLight,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
});
