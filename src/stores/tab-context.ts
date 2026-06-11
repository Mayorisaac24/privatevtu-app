import { createContext, useContext } from 'react';

type TabId = 'home' | 'services' | 'history' | 'wallet' | 'profile';

interface TabContextType {
  activeTab: TabId;
  setTab: (tab: TabId) => void;
}

export const TabContext = createContext<TabContextType>({
  activeTab: 'home',
  setTab: () => {},
});

export const useTabContext = () => useContext(TabContext);
