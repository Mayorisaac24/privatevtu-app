import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTabContext } from '../stores/tab-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CATALOG_GROUPS, type ServiceCatalogItem } from '../lib/service-catalog-ui';
import { showToast } from '../components/ui/Toast';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { setTab } = useTabContext();
  const { isUsable } = useServiceAvailability();

  const isItemAvailable = (item: ServiceCatalogItem) => {
    if (!item.route) return false;
    if (item.alwaysAvailable) return true;
    if (!item.serviceCode) return false;
    return isUsable(item.serviceCode);
  };

  const handlePress = (item: ServiceCatalogItem) => {
    if (!isItemAvailable(item) || !item.route) {
      showToast({
        type: 'info',
        text1: 'Unavailable',
        text2: `${item.label} is currently disabled`,
      });
      return;
    }
    if (item.route.startsWith('TAB:')) {
      setTab(item.route.replace('TAB:', '') as 'history' | 'wallet');
      return;
    }
    router.push(item.route as '/services/airtime');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>All Services</Text>
        <Text style={styles.headerSub}>Everything you need, in one place</Text>
      </View>

      {SERVICE_CATALOG_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.grid}>
            {group.items.map((item) => {
              const available = isItemAvailable(item);
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.serviceCard, !available && styles.serviceCardDisabled]}
                  onPress={() => handlePress(item)}
                  activeOpacity={available ? 0.75 : 1}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={available ? item.color : Colors.mutedLight} />
                  </View>
                  <Text style={[styles.serviceLabel, !available && styles.serviceLabelDisabled]}>
                    {item.label}
                  </Text>
                  {!available && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>{item.route ? 'Unavailable' : 'Soon'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: Spacing.page, paddingBottom: 20,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  headerSub: { ...Typography.small, color: Colors.muted },
  group: { paddingHorizontal: Spacing.page, paddingTop: 20 },
  groupTitle: {
    ...Typography.label, color: Colors.muted, marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: {
    width: '22%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    ...Shadow.xs,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceCardDisabled: { opacity: 0.6 },
  serviceIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  serviceLabel: { ...Typography.caption, color: Colors.dark, fontWeight: '600', textAlign: 'center' },
  serviceLabelDisabled: { color: Colors.muted },
  soonBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  soonText: {
    fontSize: 7,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0,
    textTransform: 'none',
  },
});
