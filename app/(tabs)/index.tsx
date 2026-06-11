import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStatusBarStore } from '../../src/stores';
import { Colors } from '../../src/theme';
import { refreshDashboardData, refreshHistoryData } from '../../src/lib/dashboard-data';
import { TabContext } from '../../src/stores/tab-context';

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

export default function TabNavigator() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
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
    if (activeTab === 'home') void refreshDashboardData();
    if (activeTab === 'history') void refreshHistoryData();
    if (activeTab === 'wallet') void refreshDashboardData();
  }, [activeTab]);

  const tabScreens: { id: TabId; node: React.ReactNode }[] = [
    { id: 'home', node: <HomeScreen /> },
    { id: 'services', node: <ServicesScreen /> },
    { id: 'history', node: <HistoryScreen /> },
    { id: 'wallet', node: <WalletScreen /> },
    { id: 'profile', node: <ProfileScreen /> },
  ];

  return (
    <TabContext.Provider value={{ activeTab, setTab: setActiveTab }}>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tabScreens.map(({ id, node }) => (
            <View
              key={id}
              style={[styles.tabPane, activeTab !== id && styles.tabPaneHidden]}
              pointerEvents={activeTab === id ? 'auto' : 'none'}
            >
              {node}
            </View>
          ))}
        </View>

        <View style={[styles.tabBar, { paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 10) }]}>
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
        </View>
      </View>
    </TabContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },
  screen: { flex: 1, position: 'relative' },
  tabPane: { ...StyleSheet.absoluteFillObject },
  tabPaneHidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 56,
    gap: 3,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', color: Colors.muted },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 1,
  },
});
