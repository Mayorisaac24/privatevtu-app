import { Colors } from '../theme';
import { SERVICE_CODES, type ServiceCode } from './service-availability';

export type ServiceCatalogItem = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  route: string | null;
  serviceCode?: ServiceCode;
  alwaysAvailable?: boolean;
};

export const SERVICE_CATALOG_GROUPS: Array<{ title: string; items: ServiceCatalogItem[] }> = [
  {
    title: 'Essentials',
    items: [
      { label: 'Airtime', icon: 'phone-portrait-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/airtime', serviceCode: SERVICE_CODES.airtime },
      { label: 'Data Bundle', icon: 'wifi-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/data', serviceCode: SERVICE_CODES.data },
      { label: 'Electricity', icon: 'flash-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/electricity', serviceCode: SERVICE_CODES.electricity },
      { label: 'Cable TV', icon: 'tv-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/cable', serviceCode: SERVICE_CODES.cable },
      { label: 'Education', icon: 'school-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/education', serviceCode: SERVICE_CODES.education },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Fund Wallet', icon: 'add-circle-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/wallet/fund', serviceCode: SERVICE_CODES.walletFund },
      { label: 'Transfer', icon: 'swap-horizontal-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/wallet/transfer', serviceCode: SERVICE_CODES.localTransfer },
      { label: 'Transactions', icon: 'receipt-outline', color: Colors.primary, bg: Colors.primaryMuted, route: 'TAB:history', alwaysAvailable: true },
      { label: 'Wallet', icon: 'wallet-outline', color: Colors.primary, bg: Colors.primaryMuted, route: 'TAB:wallet', alwaysAvailable: true },
    ],
  },
  {
    title: 'Coming Soon',
    items: [
      { label: 'Betting', icon: 'trophy-outline', color: Colors.primary, bg: Colors.primaryMuted, route: null },
      { label: 'Gift Cards', icon: 'gift-outline', color: Colors.primary, bg: Colors.primaryMuted, route: null },
      { label: 'Insurance', icon: 'shield-checkmark-outline', color: Colors.primary, bg: Colors.primaryMuted, route: null },
      { label: 'Savings', icon: 'trending-up-outline', color: Colors.primary, bg: Colors.primaryMuted, route: null },
      { label: 'Virtual Card', icon: 'card-outline', color: Colors.primary, bg: Colors.primaryMuted, route: null },
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
  { title: 'Airtime', icon: 'phone-portrait-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/airtime', serviceCode: SERVICE_CODES.airtime },
  { title: 'Data', icon: 'wifi-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/data', serviceCode: SERVICE_CODES.data },
  { title: 'Electric', icon: 'flash-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/electricity', serviceCode: SERVICE_CODES.electricity },
  { title: 'Cable TV', icon: 'tv-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/cable', serviceCode: SERVICE_CODES.cable },
  { title: 'Education', icon: 'school-outline', color: Colors.primary, bg: Colors.primaryMuted, route: '/services/education', serviceCode: SERVICE_CODES.education },
  { title: 'More', icon: 'grid-outline', color: Colors.primary, bg: Colors.primaryMuted, route: 'TAB:services' },
];
