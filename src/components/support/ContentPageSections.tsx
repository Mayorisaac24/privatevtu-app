import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/GlassCard';
import { type ContentSection } from '../../lib/content-page';
import { Colors, Radius } from '../../theme';

const SECTION_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'document-text-outline',
  'shield-checkmark-outline',
  'server-outline',
  'person-outline',
  'lock-closed-outline',
  'mail-outline',
];

function sectionIcon(index: number, title: string): keyof typeof Ionicons.glyphMap {
  const lower = title.toLowerCase();
  if (lower.includes('security') || lower.includes('protect')) return 'shield-checkmark-outline';
  if (lower.includes('collect') || lower.includes('data')) return 'server-outline';
  if (lower.includes('right') || lower.includes('control')) return 'person-outline';
  if (lower.includes('cookie') || lower.includes('track')) return 'eye-outline';
  if (lower.includes('contact') || lower.includes('support')) return 'mail-outline';
  return SECTION_ICONS[index % SECTION_ICONS.length];
}

type ContentPageSectionsProps = {
  sections: ContentSection[];
};

export function ContentPageSections({ sections }: ContentPageSectionsProps) {
  if (!sections.length) {
    return (
      <GlassCard variant="light" borderRadius={Radius.lg} padding={18} contentStyle={styles.emptyCard}>
        <Ionicons name="document-outline" size={28} color={Colors.mutedLight} />
        <Text style={styles.emptyTitle}>No policy content yet</Text>
        <Text style={styles.emptySub}>Check back soon or contact support if you have questions.</Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.stack}>
      {sections.map((section, index) => {
        const icon = sectionIcon(index, section.title);
        return (
          <GlassCard
            key={section.id}
            variant="light"
            borderRadius={Radius.lg}
            padding={0}
            contentStyle={styles.sectionCard}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionIndex}>Section {index + 1}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            </View>

            <View style={styles.sectionBody}>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <Text key={`${section.id}-p-${paragraphIndex}`} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}

              {section.bullets.length ? (
                <View style={styles.bulletList}>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <View key={`${section.id}-b-${bulletIndex}`} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  sectionCard: { overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, gap: 2 },
  sectionIndex: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mutedLight,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 23,
    color: Colors.mid,
  },
  bulletList: { gap: 8, marginTop: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.mid,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
