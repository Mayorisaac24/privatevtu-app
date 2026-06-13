import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStatusBarStore } from '../../src/stores';
import { useWalletStore } from '../../src/stores/wallet-store';
import { Colors, Typography } from '../../src/theme';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { refreshDashboardData, refreshHistoryData, refreshHomeDashboardStats, refreshHomeInsights } from '../../src/lib/dashboard-data';
import { TabContext } from '../../src/stores/tab-context';
import { GlassSurface } from '../../src/components/ui/GlassSurface';

import HomeScreen from '../../src/screens/HomeScreen';
import ServicesScreen from '../../src/screens/ServicesScreen';
import HistoryScreen from '../../src/screens/HistoryScreen';
import WalletScreen from '../../src/screens/WalletScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';

type TabId = 'home' | 'services' | 'history' | 'wallet' | 'profile';

const TABS = [
  { id: 'home'     as TabId, label: 'Home',     icon: 'home-outline',    iconActive: 'home' },
  { id: 'services' as TabId, label: 'Services', icon: 'grid-outline',    iconActive: 'grid' },
  { id: 'history'  as TabId, label: 'History',  icon: 'receipt-outline', iconActive: 'receipt' },
  { id: 'wallet'   as TabId, label: 'Wallet',   icon: 'wallet-outline',  iconActive: 'wallet' },
  { id: 'profile'  as TabId, label: 'Profile',  icon: 'person-outline',  iconActive: 'person' },
];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  home: HomeScreen,
  services: ServicesScreen,
  history: HistoryScreen,
  wallet: WalletScreen,
  profile: ProfileScreen,
};

export default function TabNavigator() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(() => new Set(['home']));
  const insets = useSafeAreaInsets();
  const setStatusBarStyle = useStatusBarStore((s) => s.setStyle);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, [setStatusBarStyle]),
  );

  useEffect(() => {
    setStatusBarStyle('dark');
  }, [activeTab, setStatusBarStyle]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });

    if (activeTab === 'home') void refreshDashboardData();
    if (activeTab === 'history') {
      const hydrated = useWalletStore.getState().historyHydrated;
      void refreshHistoryData({ priority: !hydrated });
      void refreshHomeDashboardStats({ force: !hydrated });
    }
    if (activeTab === 'wallet') {
      void refreshDashboardData();
      void refreshHomeInsights();
    }
  }, [activeTab]);

  return (
    <TabContext.Provider value={{ activeTab, setTab: setActiveTab }}>
      <ThemedScreen withAmbient={false}>
        <View style={styles.screen}>
          {TABS.map(({ id }) => {
            const Screen = TAB_COMPONENTS[id];
            const mounted = mountedTabs.has(id);
            return (
              <View
                key={id}
                style={[styles.tabPane, activeTab !== id && styles.tabPaneHidden]}
                pointerEvents={activeTab === id ? 'auto' : 'none'}
              >
                {mounted ? <Screen /> : null}
              </View>
            );
          })}
        </View>

        <GlassSurface
          variant="light"
          borderRadius={0}
          style={styles.tabBar}
          contentStyle={{ ...styles.tabBarInner, paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 10) }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(active ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={active ? Colors.primary : Colors.muted}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabDot} />}
              </TouchableOpacity>
            );
          })}
        </GlassSurface>
      </ThemedScreen>
    </TabContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, position: 'relative' },
  tabPane: { ...StyleSheet.absoluteFillObject },
  tabPaneHidden: { display: 'none' },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '500',
    color: Colors.muted,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 1,
  },
});
