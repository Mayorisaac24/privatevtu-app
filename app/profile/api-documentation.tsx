import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { api, isResponseSuccess, type DeveloperApiEndpointDoc } from '../../src/lib/api';
import { Colors, Radius, Spacing, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';

const SAMPLE_TABS = ['curl', 'node', 'python', 'php'] as const;

function EndpointCard({ endpoint, baseUrl }: { endpoint: DeveloperApiEndpointDoc; baseUrl: string }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const [sampleTab, setSampleTab] = useState<(typeof SAMPLE_TABS)[number]>('curl');

  const copySample = async () => {
    await Clipboard.setStringAsync(endpoint.samples[sampleTab]);
    showToast({ type: 'success', text1: 'Sample copied' });
  };

  return (
    <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} style={styles.endpointCard}>
      <TouchableOpacity style={styles.endpointHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
        <View style={[styles.methodBadge, endpoint.method === 'GET' ? styles.methodGet : styles.methodPost]}>
          <Text style={styles.methodText}>{endpoint.method}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.endpointPath}>{endpoint.path}</Text>
          <Text style={styles.endpointTitle}>{endpoint.title}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.muted} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.endpointBody}>
          <Text style={styles.endpointDesc}>{endpoint.description}</Text>
          <Text style={styles.fullUrl}>{baseUrl}{endpoint.path}</Text>

          {endpoint.fields?.length ? (
            <View style={styles.fieldsBlock}>
              <Text style={styles.fieldsTitle}>Parameters</Text>
              {endpoint.fields.map((field) => (
                <Text key={field.name} style={styles.fieldLine}>
                  <Text style={styles.fieldName}>{field.name}</Text>
                  {field.required ? ' (required)' : ''} — {field.label}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.sampleTitle}>Sample code</Text>
          <View style={styles.tabRow}>
            {SAMPLE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.sampleTab, sampleTab === tab && styles.sampleTabActive]}
                onPress={() => setSampleTab(tab)}
              >
                <Text style={[styles.sampleTabText, sampleTab === tab && styles.sampleTabTextActive]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.copyBtn} onPress={() => void copySample()}>
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.codeBlock}>{endpoint.samples[sampleTab]}</Text>
          </ScrollView>
        </View>
      ) : null}
    </GlassCard>
  );
}

export default function ApiDocumentationScreen() {
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof api.getDeveloperDocumentation>>['data']>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDeveloperDocumentation();
      if (isResponseSuccess(res)) setDocs(res.data);
      else showToast({ type: 'error', text1: 'Could not load API documentation' });
    } catch {
      showToast({ type: 'error', text1: 'Could not load API documentation' });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ProfileSubScreen
      title="API Documentation"
      subtitle="Integration endpoints, samples, and reference"
      headerIcon="book-outline"
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.stack}>
          <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
            <Text style={styles.intro}>
              Token auth via <Text style={styles.mono}>X-Api-Key</Text> + <Text style={styles.mono}>X-Api-Secret</Text>.
              Endpoints shown match services enabled on your account and exposed by the platform admin.
            </Text>
            {docs?.baseUrl ? (
              <Text style={styles.baseUrl}>Base URL: {docs.baseUrl}</Text>
            ) : null}
            {!docs?.hasActiveClient ? (
              <Text style={styles.warn}>
                Request API access from Developer API settings to receive live credentials.
              </Text>
            ) : null}
          </GlassCard>

          {docs?.endpoints?.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} baseUrl={docs.baseUrl} />
          ))}
        </View>
      )}
    </ProfileSubScreen>
  );
}

function useStyles() {
  return useThemedStyles((colors) => StyleSheet.create({
    loader: { marginTop: Spacing.xl },
    stack: { gap: Spacing.md },
    intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    mono: { fontFamily: 'monospace', color: colors.text },
    baseUrl: { marginTop: Spacing.sm, color: colors.text, fontSize: 13, fontFamily: 'monospace' },
    warn: { marginTop: Spacing.sm, color: colors.warning, fontSize: 13 },
    endpointCard: { overflow: 'hidden' },
    endpointHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    methodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    methodGet: { backgroundColor: 'rgba(59,130,246,0.15)' },
    methodPost: { backgroundColor: 'rgba(34,197,94,0.15)' },
    methodText: { fontSize: 11, fontWeight: '700', color: colors.text },
    endpointPath: { fontFamily: 'monospace', fontSize: 12, color: colors.textSecondary },
    endpointTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
    endpointBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: Spacing.md, gap: Spacing.sm },
    endpointDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    fullUrl: { fontFamily: 'monospace', fontSize: 12, color: colors.primary },
    fieldsBlock: { gap: 4 },
    fieldsTitle: { fontWeight: '600', color: colors.text, marginTop: Spacing.xs },
    fieldLine: { color: colors.textSecondary, fontSize: 12 },
    fieldName: { fontFamily: 'monospace', color: colors.text },
    sampleTitle: { fontWeight: '600', color: colors.text, marginTop: Spacing.sm },
    tabRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    sampleTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface },
    sampleTabActive: { backgroundColor: colors.primaryDim },
    sampleTabText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    sampleTabTextActive: { color: colors.primary },
    copyBtn: { marginLeft: 'auto', padding: 6 },
    codeBlock: { fontFamily: 'monospace', fontSize: 11, color: colors.text, lineHeight: 16, paddingVertical: Spacing.sm },
  }));
}
