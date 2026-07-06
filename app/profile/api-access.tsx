import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import {
  api,
  isResponseSuccess,
  type ApiAccessSnapshot,
  type DeveloperPortalSnapshot,
  type ExtendableServiceType,
} from '../../src/lib/api';
import {Colors, Radius, Spacing, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import {
  getApiAccessData,
  peekApiAccessCache,
  pullToRefreshApiAccess,
  readApiAccessFormState,
} from '../../src/lib/api-access-cache';

const FORMAT_OPTIONS = [
  { value: 'PLATFORM' as const, label: 'Platform JSON', desc: 'Native Datamart response format' },
  { value: 'MSORG' as const, label: 'MSORG compatible', desc: 'Drop-in for MSORG integrators' },
];

export default function ApiAccessScreen() {
  const styles = useStyles();
  const router = useRouter();

  const initialCache = peekApiAccessCache();
  const initialForm = initialCache ? readApiAccessFormState(initialCache) : null;
  const [loading, setLoading] = useState(!initialCache);
  const [submitting, setSubmitting] = useState(false);
  const [snapshot, setSnapshot] = useState<ApiAccessSnapshot | null>(() => initialCache);
  const [portal, setPortal] = useState<DeveloperPortalSnapshot | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ExtendableServiceType[]>([]);
  const [clientName, setClientName] = useState(() => initialForm?.clientName ?? '');
  const [responseFormat, setResponseFormat] = useState<'PLATFORM' | 'MSORG'>(() => initialForm?.responseFormat ?? 'PLATFORM');
  const [allowedServices, setAllowedServices] = useState<string[]>(() => initialForm?.allowedServices ?? []);
  const [webhookUrl, setWebhookUrl] = useState(() => initialForm?.webhookUrl ?? '');
  const [allowedIpsText, setAllowedIpsText] = useState('');
  const [userNote, setUserNote] = useState(() => initialForm?.userNote ?? '');
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  const applySnapshot = useCallback((data: ApiAccessSnapshot) => {
    setSnapshot(data);
    const form = readApiAccessFormState(data);
    if (form) {
      setClientName(form.clientName);
      setResponseFormat(form.responseFormat);
      setAllowedServices(form.allowedServices);
      setWebhookUrl(form.webhookUrl);
      setUserNote(form.userNote);
    }
  }, []);

  const load = useCallback(async (options?: { force?: boolean; showSpinner?: boolean }) => {
    const showSpinner = options?.showSpinner ?? !peekApiAccessCache();
    if (showSpinner) setLoading(true);
    try {
      const [accessRes, servicesRes, portalRes] = await Promise.all([
        options?.force ? pullToRefreshApiAccess() : getApiAccessData(),
        api.getExtendableServices(),
        api.getDeveloperPortal(),
      ]);

      if (servicesRes && isResponseSuccess(servicesRes) && servicesRes.data?.length) {
        setServiceOptions(servicesRes.data);
        setAllowedServices((prev) => (prev.length ? prev : servicesRes.data!.map((s) => s.code)));
      }

      if (portalRes && isResponseSuccess(portalRes)) {
        setPortal(portalRes.data ?? null);
        const ips = portalRes.data?.client?.allowedIps ?? [];
        setAllowedIpsText(ips.join('\n'));
      }

      if (accessRes) applySnapshot(accessRes);
      else if (!peekApiAccessCache()) {
        showToast({ type: 'error', text1: 'Could not load API access status' });
      }
    } catch {
      if (!peekApiAccessCache()) {
        showToast({ type: 'error', text1: 'Could not load API access status' });
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [applySnapshot]);

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
        await load({ force: true, showSpinner: false });
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
        await load({ force: true, showSpinner: false });
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
        allowedIps: allowedIpsText
          .split(/[\n,]/)
          .map((ip) => ip.trim())
          .filter(Boolean),
      });
      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: 'Settings saved',
          text2: `Response format is now ${responseFormat}`,
        });
        await load({ force: true, showSpinner: false });
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

  const handleRotateKeys = async () => {
    setSubmitting(true);
    try {
      const res = await api.rotateApiKeys('TEST');
      if (isResponseSuccess(res) && res.data?.credentials?.secretKey) {
        setRotatedSecret(res.data.credentials.secretKey);
        showToast({ type: 'success', text1: 'Keys rotated', text2: 'Copy the new secret now — it will not be shown again' });
        await load({ force: true, showSpinner: false });
      } else {
        showToast({ type: 'error', text1: 'Could not rotate keys', text2: res.message });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not rotate keys';
      showToast({ type: 'error', text1: 'Could not rotate keys', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    showToast({ type: 'success', text1: `${label} copied` });
  };

  const activeClient = snapshot?.activeClient;
  const pending = snapshot?.pending;
  const latest = snapshot?.latest;
  const hasAccess = Boolean(activeClient?.isActive);
  const hasPending = Boolean(pending);

  return (
    <ProfileSubScreen
      title="Developer's API"
      subtitle="Manage integrations on the web dashboard"
      headerIcon="code-slash-outline"
    >
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={16} style={styles.webNotice}>
        <View style={styles.statusHeader}>
          <Ionicons name="desktop-outline" size={22} color={Colors.primary} />
          <Text style={styles.statusTitle}>Web dashboard required</Text>
        </View>
        <Text style={styles.meta}>
          API access requests, key rotation, documentation, and live endpoint testing are available on the PrivateVTU web app under Developer&apos;s API.
        </Text>
      </GlassCard>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : hasAccess ? (
        <View style={styles.stack}>
          <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.statusTitle}>API access active</Text>
            </View>
            {portal?.baseUrl ? (
              <TouchableOpacity style={styles.copyRow} onPress={() => void copyText('Base URL', portal.baseUrl)}>
                <Text style={styles.meta}>Base URL: {portal.baseUrl}</Text>
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.copyRow}
              onPress={() => void copyText('Public key', portal?.client?.maskedPublicKey || activeClient?.testPublicKey || '')}
            >
              <Text style={styles.meta}>
                API key: {portal?.client?.maskedPublicKey || activeClient?.testPublicKey}
              </Text>
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
            {rotatedSecret ? (
              <TouchableOpacity style={styles.secretBox} onPress={() => void copyText('Secret key', rotatedSecret)}>
                <Text style={styles.secretLabel}>New secret (tap to copy)</Text>
                <Text style={styles.secretValue}>{rotatedSecret}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.hint}>
                Secret keys are only shown when access is approved or after a reset.
              </Text>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void handleRotateKeys()} disabled={submitting}>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Reset keys</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/profile/api-documentation')}>
                <Ionicons name="book-outline" size={16} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Documentation</Text>
              </TouchableOpacity>
            </View>
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
              {(serviceOptions.length ? serviceOptions.map((s) => s.code) : allowedServices).map((service) => {
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

            <Text style={[styles.fieldLabel, styles.fieldGap]}>IP whitelist (optional)</Text>
            <TextInput
              value={allowedIpsText}
              onChangeText={setAllowedIpsText}
              placeholder={'192.168.1.1\n10.0.0.1'}
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <Text style={styles.hint}>One IP per line or comma-separated. Leave empty to allow all IPs.</Text>
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
                  {(serviceOptions.length ? serviceOptions.map((s) => s.code) : allowedServices).map((service) => {
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

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  loader: { marginTop: 24 },
  webNotice: { marginBottom: Spacing.md },
  stack: { gap: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
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
    color: colors.dark,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mid,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.borderMid,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  secretBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secretLabel: {
    fontSize: 12,
    color: colors.mid,
    marginBottom: 4,
  },
  secretValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.dark,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mid,
    marginBottom: 8,
  },
  fieldGap: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.dark,
    backgroundColor: colors.surface,
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
    borderColor: colors.borderMid,
    marginBottom: 8,
  },
  formatOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  formatRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formatRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  formatDesc: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
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
    borderColor: colors.borderMid,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mid,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primary,
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelBtnText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 6,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
