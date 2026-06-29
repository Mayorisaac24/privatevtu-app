import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import {
  api,
  isResponseSuccess,
  type ApiAccessSnapshot,
} from '../../src/lib/api';
import { Colors, Radius, Spacing } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';

const SERVICE_OPTIONS = ['airtime', 'data', 'electricity', 'cable', 'betting'] as const;
const FORMAT_OPTIONS = [
  { value: 'PLATFORM' as const, label: 'Platform JSON', desc: 'Native PrivateVTU response format' },
  { value: 'MSORG' as const, label: 'MSORG compatible', desc: 'Drop-in for MSORG integrators' },
];

export default function ApiAccessScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snapshot, setSnapshot] = useState<ApiAccessSnapshot | null>(null);
  const [clientName, setClientName] = useState('');
  const [responseFormat, setResponseFormat] = useState<'PLATFORM' | 'MSORG'>('PLATFORM');
  const [allowedServices, setAllowedServices] = useState<string[]>([...SERVICE_OPTIONS]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [userNote, setUserNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyApiAccess();
      if (isResponseSuccess(res) && res.data) {
        setSnapshot(res.data);
        if (res.data.activeClient) {
          setClientName(res.data.activeClient.name || '');
          setResponseFormat(res.data.activeClient.responseFormat);
          setAllowedServices(
            res.data.activeClient.allowedServices?.length
              ? res.data.activeClient.allowedServices
              : [...SERVICE_OPTIONS],
          );
          setWebhookUrl(res.data.activeClient.webhookUrl || '');
        } else if (res.data.pending) {
          setClientName(res.data.pending.clientName);
          setResponseFormat(res.data.pending.requestedResponseFormat);
          setAllowedServices(res.data.pending.requestedAllowedServices);
          setWebhookUrl(res.data.pending.requestedWebhookUrl || '');
          setUserNote(res.data.pending.userNote || '');
        }
      }
    } catch {
      showToast({ type: 'error', text1: 'Could not load API access status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleService = (service: string) => {
    setAllowedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      showToast({ type: 'error', text1: 'Client name required' });
      return;
    }
    if (allowedServices.length === 0) {
      showToast({ type: 'error', text1: 'Select at least one service' });
      return;
    }
    setSubmitting(true);
    try {
      const pendingId = snapshot?.pending?.id;
      const payload = {
        clientName: clientName.trim(),
        requestedResponseFormat: responseFormat,
        requestedAllowedServices: allowedServices,
        requestedWebhookUrl: webhookUrl.trim() || undefined,
        userNote: userNote.trim() || undefined,
      };

      const res = pendingId
        ? await api.updateApiAccessRequest(pendingId, payload)
        : await api.submitApiAccessRequest(payload);

      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: pendingId ? 'Request updated' : 'Request submitted',
          text2: pendingId
            ? 'Your pending request has been updated'
            : 'An admin will review your API access request',
        });
        await load();
      } else {
        showToast({ type: 'error', text1: 'Request failed', text2: res.message });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      showToast({ type: 'error', text1: 'Request failed', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const pendingId = snapshot?.pending?.id;
    if (!pendingId) return;
    setSubmitting(true);
    try {
      const res = await api.cancelApiAccessRequest(pendingId);
      if (isResponseSuccess(res)) {
        showToast({ type: 'success', text1: 'Request cancelled' });
        setClientName('');
        setUserNote('');
        setWebhookUrl('');
        await load();
      } else {
        showToast({ type: 'error', text1: 'Could not cancel request', text2: res.message });
      }
    } catch {
      showToast({ type: 'error', text1: 'Could not cancel request' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (allowedServices.length === 0) {
      showToast({ type: 'error', text1: 'Select at least one service' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.updateMyApiAccessSettings({
        clientName: clientName.trim() || undefined,
        responseFormat,
        allowedServices,
        webhookUrl: webhookUrl.trim() || null,
      });
      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: 'Settings saved',
          text2: `Response format is now ${responseFormat}`,
        });
        await load();
      } else {
        showToast({ type: 'error', text1: 'Could not save settings', text2: res.message });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save settings';
      showToast({ type: 'error', text1: 'Could not save settings', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const activeClient = snapshot?.activeClient;
  const pending = snapshot?.pending;
  const latest = snapshot?.latest;
  const hasAccess = Boolean(activeClient?.isActive);
  const hasPending = Boolean(pending);

  return (
    <ProfileSubScreen
      title="API Access"
      subtitle="Request developer API credentials"
      headerIcon="code-slash-outline"
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : hasAccess ? (
        <View style={styles.stack}>
          <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.statusTitle}>API access active</Text>
            </View>
            <Text style={styles.meta}>Live key: {activeClient?.livePublicKey}</Text>
            <Text style={styles.meta}>Test key: {activeClient?.testPublicKey}</Text>
            {activeClient?.lastUsedAt ? (
              <Text style={styles.meta}>
                Last used: {new Date(activeClient.lastUsedAt).toLocaleString()}
              </Text>
            ) : null}
            <Text style={styles.hint}>
              Secret keys are only shown once when access is approved. Contact support if you need a reset.
            </Text>
          </GlassCard>

          <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
            <Text style={styles.sectionTitle}>Integration settings</Text>
            <Text style={styles.hint}>
              You can change response format and services anytime. Updates apply immediately to your next API call.
            </Text>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>Integration name</Text>
            <TextInput
              value={clientName}
              onChangeText={setClientName}
              placeholder="e.g. My VTU App"
              placeholderTextColor={Colors.muted}
              style={styles.input}
            />

            <Text style={[styles.fieldLabel, styles.fieldGap]}>Response format</Text>
            {FORMAT_OPTIONS.map((opt) => {
              const selected = responseFormat === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.formatOption, selected && styles.formatOptionSelected]}
                  onPress={() => setResponseFormat(opt.value)}
                  activeOpacity={0.85}
                >
                  <View style={styles.formatRadio}>
                    {selected ? <View style={styles.formatRadioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formatLabel}>{opt.label}</Text>
                    <Text style={styles.formatDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.fieldLabel, styles.fieldGap]}>Services</Text>
            <View style={styles.chipRow}>
              {SERVICE_OPTIONS.map((service) => {
                const checked = allowedServices.includes(service);
                return (
                  <TouchableOpacity
                    key={service}
                    style={[styles.chip, checked && styles.chipActive]}
                    onPress={() => toggleService(service)}
                  >
                    <Text style={[styles.chipText, checked && styles.chipTextActive]}>
                      {service}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>Webhook URL (optional)</Text>
            <TextInput
              value={webhookUrl}
              onChangeText={setWebhookUrl}
              placeholder="https://your-app.com/webhooks/vtu"
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </GlassCard>

          <GradientButton
            title={submitting ? 'Saving...' : 'Save settings'}
            onPress={() => void handleSaveSettings()}
            disabled={submitting}
          />
        </View>
      ) : (
        <View style={styles.stack}>
          {hasPending ? (
            <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
              <View style={styles.statusHeader}>
                <Ionicons name="time-outline" size={22} color={Colors.warning} />
                <Text style={styles.statusTitle}>Request pending review</Text>
              </View>
              <Text style={styles.hint}>
                You can update your request details below while it is pending.
              </Text>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => void handleCancel()}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel request</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : null}

          {!hasAccess ? (
            <>
              <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
                <Text style={styles.fieldLabel}>Integration name</Text>
                <TextInput
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="e.g. My VTU App"
                  placeholderTextColor={Colors.muted}
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, styles.fieldGap]}>Response format</Text>
                {FORMAT_OPTIONS.map((opt) => {
                  const selected = responseFormat === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.formatOption, selected && styles.formatOptionSelected]}
                      onPress={() => setResponseFormat(opt.value)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.formatRadio}>
                        {selected ? <View style={styles.formatRadioDot} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formatLabel}>{opt.label}</Text>
                        <Text style={styles.formatDesc}>{opt.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <Text style={[styles.fieldLabel, styles.fieldGap]}>Services</Text>
                <View style={styles.chipRow}>
                  {SERVICE_OPTIONS.map((service) => {
                    const checked = allowedServices.includes(service);
                    return (
                      <TouchableOpacity
                        key={service}
                        style={[styles.chip, checked && styles.chipActive]}
                        onPress={() => toggleService(service)}
                      >
                        <Text style={[styles.chipText, checked && styles.chipTextActive]}>
                          {service}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, styles.fieldGap]}>Webhook URL (optional)</Text>
                <TextInput
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  placeholder="https://your-app.com/webhooks/vtu"
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="none"
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, styles.fieldGap]}>Note for admin (optional)</Text>
                <TextInput
                  value={userNote}
                  onChangeText={setUserNote}
                  placeholder="Describe your integration or use case"
                  placeholderTextColor={Colors.muted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </GlassCard>

              <GradientButton
                title={
                  submitting
                    ? 'Saving...'
                    : hasPending
                      ? 'Update request'
                      : 'Submit request'
                }
                onPress={() => void handleSubmit()}
                disabled={submitting}
              />
            </>
          ) : null}

          {!hasPending && latest && latest.status === 'REJECTED' ? (
            <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
              <Text style={styles.rejectedTitle}>Last request was rejected</Text>
              {latest.reviewNote ? (
                <Text style={styles.meta}>{latest.reviewNote}</Text>
              ) : (
                <Text style={styles.meta}>You can submit a new request with updated details.</Text>
              )}
            </GlassCard>
          ) : null}
        </View>
      )}
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  stack: { gap: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.mid,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.muted,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mid,
    marginBottom: 8,
  },
  fieldGap: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.dark,
    backgroundColor: Colors.surface,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    marginBottom: 8,
  },
  formatOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  formatRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formatRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  formatDesc: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mid,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: Colors.primary,
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 6,
  },
});
