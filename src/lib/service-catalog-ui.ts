import { Colors } from '../theme';
import { SERVICE_CODES, type ServiceCode } from './service-availability';

export const SERVICE_ICON = {
  color: Colors.primary,
  bg: Colors.primaryMuted,
} as const;

export type ServiceCatalogItem = {
  label: string;
  subtitle?: string;
  icon: string;
  color: string;
  bg: string;
  route: string | null;
  serviceCode?: ServiceCode;
  alwaysAvailable?: boolean;
};

function catalogItem(
  item: Omit<ServiceCatalogItem, 'color' | 'bg'> & { color?: string; bg?: string },
): ServiceCatalogItem {
  return {
    ...item,
    color: item.color ?? SERVICE_ICON.color,
    bg: item.bg ?? SERVICE_ICON.bg,
  };
}

export const SERVICE_CATALOG_GROUPS: Array<{ title: string; items: ServiceCatalogItem[] }> = [
  {
    title: 'Essentials',
    items: [
      catalogItem({
        label: 'Airtime',
        subtitle: 'Top up MTN, Airtel, Glo & T2',
        icon: 'phone-portrait-outline',
        route: '/services/airtime',
        serviceCode: SERVICE_CODES.airtime,
      }),
      catalogItem({
        label: 'Data Bundle',
        subtitle: 'Daily, weekly & monthly plans',
        icon: 'wifi-outline',
        route: '/services/data',
        serviceCode: SERVICE_CODES.data,
      }),
      catalogItem({
        label: 'Electricity',
        subtitle: 'Prepaid & postpaid disco bills',
        icon: 'flash-outline',
        route: '/services/electricity',
        serviceCode: SERVICE_CODES.electricity,
      }),
      catalogItem({
        label: 'Cable TV',
        subtitle: 'DSTV, GOtv, Startimes & more',
        icon: 'tv-outline',
        route: '/services/cable',
        serviceCode: SERVICE_CODES.cable,
      }),
      catalogItem({
        label: 'Education',
        subtitle: 'WAEC, JAMB & exam pins',
        icon: 'school-outline',
        route: '/services/education',
        serviceCode: SERVICE_CODES.education,
      }),
      catalogItem({
        label: 'Betting',
        subtitle: 'Fund SportyBet, Bet9ja & more',
        icon: 'trophy-outline',
        route: '/services/betting',
        serviceCode: SERVICE_CODES.betting,
      }),
    ],
  },
  {
    title: 'Finance',
    items: [
      catalogItem({
        label: 'Fund Wallet',
        subtitle: 'Add money via bank transfer',
        icon: 'add-circle-outline',
        route: '/wallet/fund',
        serviceCode: SERVICE_CODES.walletFund,
      }),
      catalogItem({
        label: 'Transfer',
        subtitle: 'Send to any Nigerian bank',
        icon: 'swap-horizontal-outline',
        route: '/wallet/transfer',
        serviceCode: SERVICE_CODES.localTransfer,
      }),
      catalogItem({
        label: 'Transactions',
        subtitle: 'View purchases & wallet history',
        icon: 'receipt-outline',
        route: 'TAB:history',
        alwaysAvailable: true,
      }),
      catalogItem({
        label: 'Wallet',
        subtitle: 'Balance, funding & activity',
        icon: 'wallet-outline',
        route: 'TAB:wallet',
        alwaysAvailable: true,
      }),
    ],
  },
  {
    title: 'Coming Soon',
    items: [
      { label: 'Gift Cards', icon: 'gift-outline', color: Colors.muted, bg: Colors.surfaceAlt, route: null },
      { label: 'Insurance', icon: 'shield-checkmark-outline', color: Colors.muted, bg: Colors.surfaceAlt, route: null },
      { label: 'Savings', icon: 'trending-up-outline', color: Colors.muted, bg: Colors.surfaceAlt, route: null },
      { label: 'Virtual Card', icon: 'card-outline', color: Colors.muted, bg: Colors.surfaceAlt, route: null },
    ],
  },
];

export const HOME_QUICK_ACTIONS: Array<{
  title: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
  serviceCode?: ServiceCode;
}> = [
  { title: 'Airtime', icon: 'phone-portrait-outline', ...SERVICE_ICON, route: '/services/airtime', serviceCode: SERVICE_CODES.airtime },
  { title: 'Data', icon: 'wifi-outline', ...SERVICE_ICON, route: '/services/data', serviceCode: SERVICE_CODES.data },
  { title: 'Electric', icon: 'flash-outline', ...SERVICE_ICON, route: '/services/electricity', serviceCode: SERVICE_CODES.electricity },
  { title: 'Cable TV', icon: 'tv-outline', ...SERVICE_ICON, route: '/services/cable', serviceCode: SERVICE_CODES.cable },
  { title: 'Education', icon: 'school-outline', ...SERVICE_ICON, route: '/services/education', serviceCode: SERVICE_CODES.education },
  { title: 'More', icon: 'grid-outline', ...SERVICE_ICON, route: 'TAB:services' },
];
