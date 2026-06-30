import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useSupportFaq } from '../../src/hooks/useSupportContent';
import { Colors, Radius } from '../../src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function FaqAccordion({ item }: { item: { id: string; question: string; answer: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((v) => !v);
      }}
    >
      <GlassCard variant="light" borderRadius={Radius.lg} padding={0} contentStyle={styles.faqItem}>
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary} />
        </View>
        {open ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const { intro, categories, loading } = useSupportFaq();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, query]);

  return (
    <ProfileSubScreen
      title="Help & FAQ"
      subtitle="Search answers or contact support"
      headerIcon="help-circle-outline"
    >
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search help articles..."
          placeholderTextColor={Colors.mutedLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          {intro ? (
            <GlassCard variant="tinted" borderRadius={Radius.lg} padding={16} contentStyle={styles.introCard}>
              <Text style={styles.introText}>{intro}</Text>
            </GlassCard>
          ) : null}

          {filtered.map((category) => (
            <View key={category.id} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {category.items.map((item) => (
                <FaqAccordion key={item.id} item={item} />
              ))}
            </View>
          ))}

          {filtered.length === 0 ? (
            <GlassCard contentStyle={styles.emptyCard}>
              <Ionicons name="search-outline" size={28} color={Colors.mutedLight} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptySub}>Try different keywords or contact support.</Text>
            </GlassCard>
          ) : null}
        </>
      )}

      <TouchableOpacity style={styles.supportBtn} onPress={() => router.push('/profile/contact')} activeOpacity={0.85}>
        <Ionicons name="chatbubbles-outline" size={18} color={Colors.white} />
        <Text style={styles.supportBtnText}>Contact Support</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.disputeLink} onPress={() => router.push('/profile/disputes')} activeOpacity={0.85}>
        <Ionicons name="shield-outline" size={16} color={Colors.primary} />
        <Text style={styles.disputeLinkText}>View my disputes</Text>
      </TouchableOpacity>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.dark },
  introCard: { gap: 4 },
  introText: { fontSize: 14, lineHeight: 22, color: Colors.mid },
  categoryBlock: { gap: 8, marginTop: 4 },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.4,
    marginLeft: 4,
    marginTop: 8,
  },
  faqItem: { padding: 14, gap: 10 },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.dark, lineHeight: 21 },
  faqAnswer: { fontSize: 14, lineHeight: 22, color: Colors.muted },
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  supportBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  disputeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  disputeLinkText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
