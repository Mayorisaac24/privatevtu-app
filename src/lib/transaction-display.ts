import { Colors, ReceiptColors } from '../theme';
import type { Transaction } from './api';
import { formatAccountNumberDisplay } from './transfer-banks';
import { formatBettingPlatformLabel } from './betting-platforms';

export type DisplayStatus = 'pending' | 'processing' | 'successful' | 'failed';

export interface EnrichedTransaction extends Transaction {
  category?: string;
  displayStatus?: DisplayStatus;
  displayStatusLabel?: string;
  displayTitle?: string;
  subtitle?: string;
  logoType?: 'provider' | 'bank' | 'service';
  logoKey?: string;
  isCredit?: boolean;
  network?: string;
  displayAmountKobo?: string;
}

export interface TxDisplayMeta {
  icon: string;
  label: string;
  bgColor: string;
  iconColor: string;
  isCredit: boolean;
}

export interface StatusMeta {
  label: string;
  bg: string;
  text: string;
  dot: string;
  tone: 'pending' | 'processing' | 'successful' | 'failed';
}

const BRAND_TX_ICON = { bgColor: Colors.primaryMuted, iconColor: Colors.primary };

const TYPE_META: Record<string, Omit<TxDisplayMeta, 'isCredit'>> = {
  AIRTIME: { icon: 'phone-portrait-outline', label: 'Airtime', ...BRAND_TX_ICON },
  DATA: { icon: 'wifi-outline', label: 'Data', ...BRAND_TX_ICON },
  ELECTRICITY: { icon: 'flash-outline', label: 'Electricity', ...BRAND_TX_ICON },
  CABLE: { icon: 'tv-outline', label: 'Cable TV', ...BRAND_TX_ICON },
  TRANSFER: { icon: 'paper-plane-outline', label: 'Transfer', ...BRAND_TX_ICON },
  WITHDRAWAL: { icon: 'paper-plane-outline', label: 'Bank Transfer', ...BRAND_TX_ICON },
  WALLET_FUND: { icon: 'wallet-outline', label: 'Wallet Funding', ...BRAND_TX_ICON },
  ADMIN_CREDIT: { icon: 'wallet-outline', label: 'Wallet Funding', ...BRAND_TX_ICON },
  EDUCATION: { icon: 'school-outline', label: 'Education', ...BRAND_TX_ICON },
  BETTING: { icon: 'trophy-outline', label: 'Betting', ...BRAND_TX_ICON },
};

const INSTANT_SERVICE_TYPES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'BETTING'];

function normalizeStatus(status?: string, type?: string): DisplayStatus {
  const value = String(status || '').toLowerCase();
  const txType = String(type || '').toUpperCase();
  if (value === 'successful' || value === 'success' || value === 'completed') return 'successful';
  if (value === 'failed' || value === 'reversed') return 'failed';
  if (value === 'processing') {
    if (INSTANT_SERVICE_TYPES.includes(txType)) return 'successful';
    return 'processing';
  }
  return 'pending';
}

function readMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

function resolveDisplayAmountKobo(tx: Transaction): string {
  if (tx.displayAmount) return tx.displayAmount;

  const type = String(tx.type || '').toUpperCase();
  const storedAmount = String(tx.amount || '0');
  const meta = readMetadataRecord(tx.metadata);
  const transferAmount = tx.transferDetails?.transferAmount ?? meta?.transferAmount;

  if (
    (type === 'WITHDRAWAL' || type === 'TRANSFER')
    && transferAmount != null
    && String(transferAmount).length > 0
  ) {
    return String(transferAmount);
  }

  return storedAmount;
}

function resolveFeeKobo(tx: Transaction): string {
  if (tx.fee && BigInt(tx.fee) > 0n) return tx.fee;

  const meta = readMetadataRecord(tx.metadata);
  if (meta?.fee != null && String(meta.fee).length > 0) {
    return String(meta.fee);
  }

  if (tx.transferDetails?.fee && BigInt(tx.transferDetails.fee) > 0n) {
    return tx.transferDetails.fee;
  }

  return '0';
}

export function getTransactionDisplayAmountKobo(tx: Transaction): string {
  return resolveDisplayAmountKobo(tx);
}

export function getTransactionFeeKobo(tx: Transaction): string {
  return resolveFeeKobo(tx);
}

/** Mirror backend: hide internal operational-wallet admin credits from user history. */
export function isCustomerVisibleTransaction(type: string, metadata?: unknown): boolean {
  const normalized = String(type || '').toUpperCase();
  if (normalized === 'ADMIN_DEBIT') return false;
  if (normalized !== 'ADMIN_CREDIT') return true;

  const meta = readMetadataRecord(metadata);
  if (!meta) return true;
  if (meta.customerVisible === true) return true;
  if (meta.customerVisible === false) return false;

  const walletType = String(meta.walletType || '');
  const targetWalletType = String(meta.targetWalletType || '');
  return walletType !== 'OPERATIONAL' && targetWalletType !== 'OPERATIONAL';
}

function normalizeCategory(type: string): string {
  const normalized = String(type || '').toUpperCase();
  if (['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'BETTING'].includes(normalized)) return 'services';
  if (normalized === 'WALLET_FUND' || normalized === 'ADMIN_CREDIT') return 'wallet_funding';
  if (['WITHDRAWAL', 'TRANSFER'].includes(normalized)) return 'transfer';
  return 'other';
}

function readMetaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function enrichTransaction(tx: Transaction): EnrichedTransaction {
  const txType = String(tx.type || '').toUpperCase();
  const displayStatus = tx.displayStatus
    ? normalizeStatus(tx.displayStatus)
    : normalizeStatus(tx.status, txType);
  const category = tx.category || normalizeCategory(txType);
  const metadata = tx.metadata;
  const network = String(tx.provider || tx.network || '').trim();
  const phone = String(tx.phone || '').trim();

  let displayTitle = tx.displayTitle;
  if (txType === 'WITHDRAWAL' || txType === 'TRANSFER') {
    const recipient = readMetaString(metadata, 'accountName')
      || readMetaString(metadata, 'recipientName')
      || phone;
    displayTitle = recipient || 'Bank transfer';
  } else if (!displayTitle) {
    if (txType === 'AIRTIME') {
      displayTitle = network ? `${network} Airtime` : 'Airtime purchase';
    } else if (txType === 'DATA') {
      displayTitle = network ? `${network} Data` : 'Data purchase';
    } else if (txType === 'ELECTRICITY') {
      displayTitle = 'Electricity payment';
    } else if (txType === 'CABLE') {
      displayTitle = network ? `${network} Cable TV` : 'Cable TV payment';
    } else if (txType === 'EDUCATION') {
      const examBody = readMetaString(metadata, 'providerDisplayName')
        || readMetaString(metadata, 'provider')
        || network;
      displayTitle = examBody ? `${examBody.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} PIN` : 'Education PIN';
    } else if (txType === 'BETTING') {
      const platformName = readMetaString(metadata, 'platformName')
        || formatBettingPlatformLabel({
          code: readMetaString(metadata, 'platform') || network,
        });
      displayTitle = platformName ? `${platformName} funding` : 'Betting funding';
    } else if (txType === 'WALLET_FUND' || txType === 'ADMIN_CREDIT') {
      displayTitle = 'Wallet funding';
    } else {
      displayTitle = txType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  let subtitle = tx.subtitle;
  if (txType === 'WITHDRAWAL' || txType === 'TRANSFER') {
    const accountNumber = readMetaString(metadata, 'accountNumber');
    if (accountNumber) {
      subtitle = formatAccountNumberDisplay(accountNumber);
    } else if (subtitle) {
      subtitle = subtitle.replace(/^\d{3,6}\s*·\s*/, '').trim();
    } else {
      subtitle = tx.reference;
    }
  } else if (!subtitle) {
    if (txType === 'BETTING') {
      const platformName = readMetaString(metadata, 'platformName')
        || formatBettingPlatformLabel({
          code: readMetaString(metadata, 'platform') || network,
        });
      const account = readMetaString(metadata, 'accountNumber') || phone;
      subtitle = account && platformName
        ? `${account} · ${platformName}`
        : account || platformName || tx.reference;
    } else if (phone && network) {
      subtitle = `${phone} · ${network}`;
    } else {
      subtitle = phone || network || tx.reference;
    }
  }

  let logoType = tx.logoType as EnrichedTransaction['logoType'];
  let logoKey = tx.logoKey;
  if (!logoType || !logoKey) {
    if (txType === 'WITHDRAWAL' || txType === 'TRANSFER') {
      logoType = 'bank';
      logoKey = readMetaString(metadata, 'bankCode');
    } else if (['AIRTIME', 'DATA', 'EDUCATION', 'BETTING'].includes(txType)) {
      logoType = 'provider';
      logoKey = (readMetaString(metadata, 'provider') || readMetaString(metadata, 'platform') || network).toLowerCase();
    } else {
      logoType = 'service';
      logoKey = network.toLowerCase() || txType.toLowerCase();
    }
  }

  const isCredit = txType === 'WALLET_FUND' || txType === 'ADMIN_CREDIT' || Boolean(tx.isCredit);
  const displayAmountKobo = resolveDisplayAmountKobo(tx);

  return {
    ...tx,
    type: txType,
    category,
    displayStatus,
    displayStatusLabel: tx.displayStatusLabel || getStatusMeta(displayStatus).label,
    displayTitle,
    subtitle,
    logoType,
    logoKey,
    isCredit,
    displayAmountKobo,
  };
}

export function getTransactionMeta(tx: Transaction): TxDisplayMeta {
  const enriched = enrichTransaction(tx);
  const base = TYPE_META[tx.type] ?? {
    icon: 'receipt-outline',
    label: enriched.displayTitle || tx.type.replace(/_/g, ' '),
    bgColor: Colors.primaryMuted,
    iconColor: Colors.primary,
  };
  return {
    ...base,
    bgColor: Colors.primaryMuted,
    iconColor: Colors.primary,
    label: enriched.displayTitle || base.label,
    isCredit: enriched.type === 'WALLET_FUND' || enriched.type === 'ADMIN_CREDIT' || Boolean(enriched.isCredit),
  };
}

export function formatTransactionTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTransactionDateTime(createdAt: string): string {
  const d = new Date(createdAt);
  const time = formatTransactionTime(createdAt);
  const date = d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${time} · ${date}`;
}

export function getTransactionListTitle(tx: EnrichedTransaction): string {
  return tx.displayTitle || tx.type;
}

export function getTransactionListSubtitle(tx: EnrichedTransaction): string {
  return getTransactionDetailLine(tx);
}

export function getTransactionDetailLine(tx: EnrichedTransaction): string {
  const dateLine = formatTransactionDateTime(tx.createdAt);
  return tx.subtitle ? `${tx.subtitle} · ${dateLine}` : dateLine;
}

export function getAmountPresentation(tx: EnrichedTransaction): { prefix: '+' | '-'; color: string } {
  const status = normalizeStatus(tx.displayStatus || tx.status);
  const isFunding = tx.type === 'WALLET_FUND' || tx.type === 'ADMIN_CREDIT';
  const prefix: '+' | '-' = isFunding || tx.isCredit ? '+' : '-';
  if (status === 'failed') return { prefix, color: Colors.error };
  if (isFunding) return { prefix, color: Colors.success };
  return { prefix, color: Colors.dark };
}

export function dedupeTransactionsForDisplay<T extends { id: string; type: string; reference: string; metadata?: unknown }>(
  rows: T[],
): T[] {
  const withdrawalRefs = new Set(
    rows.filter((row) => row.type === 'WITHDRAWAL').map((row) => row.reference),
  );
  const seen = new Set<string>();

  return rows.filter((row) => {
    if (!isCustomerVisibleTransaction(row.type, row.metadata)) return false;
    if (row.type === 'TRANSFER' && withdrawalRefs.has(row.reference)) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function getTransactionVisual(tx: EnrichedTransaction) {
  const meta = getTransactionMeta(tx);
  return {
    ...meta,
    logoType: tx.logoType || 'service',
    providerCode: tx.logoType === 'provider' ? tx.logoKey : undefined,
  };
}

export function getStatusMeta(status: DisplayStatus | string): StatusMeta {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'successful':
      return {
        label: 'Successful',
        bg: Colors.successLight,
        text: Colors.successDark,
        dot: Colors.success,
        tone: 'successful',
      };
    case 'processing':
      return {
        label: 'Processing',
        bg: ReceiptColors.pendingBg,
        text: ReceiptColors.pendingText,
        dot: ReceiptColors.pendingDot,
        tone: 'processing',
      };
    case 'failed':
      return {
        label: 'Failed',
        bg: Colors.errorLight,
        text: Colors.errorDark,
        dot: Colors.error,
        tone: 'failed',
      };
    default:
      return {
        label: 'Pending',
        bg: Colors.warningLight,
        text: Colors.warningDark,
        dot: Colors.warning,
        tone: 'pending',
      };
  }
}

export function formatTxSecondary(tx: Transaction): string {
  return getTransactionDetailLine(enrichTransaction(tx));
}

export function matchesHistoryTab(tx: EnrichedTransaction, tab: 'all' | 'services' | 'wallet'): boolean {
  if (tab === 'all') return true;
  if (tab === 'services') return tx.category === 'services';
  if (tab === 'wallet') return tx.category === 'wallet_funding';
  return true;
}

export interface MonthlyInsights {
  moneyIn: bigint;
  moneyOut: bigint;
  inCount: number;
  outCount: number;
}

export interface HomeDashboardStats {
  monthTransactionCount: number;
  monthSuccessfulCount: number;
  monthServiceSpendKobo: bigint;
  topServiceType: string | null;
}

export function getServiceTypeLabel(type: string | null): string {
  if (!type) return 'services';
  const meta = TYPE_META[type.toUpperCase()];
  return meta?.label?.toLowerCase() ?? type.replace(/_/g, ' ').toLowerCase();
}

const SUCCESS_STATUSES = new Set(['SUCCESS', 'SUCCESSFUL', 'COMPLETED']);

const SERVICE_SPEND_TYPES = new Set([
  'AIRTIME',
  'DATA',
  'CABLE',
  'ELECTRICITY',
  'EDUCATION',
  'BETTING',
  'INSURANCE',
]);

export function computeHomeDashboardStats(
  transactions: Array<{ type: string; status: string; amount: string; createdAt: string }>,
): HomeDashboardStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let monthTransactionCount = 0;
  let monthSuccessfulCount = 0;
  let monthServiceSpendKobo = 0n;
  const serviceTypeCounts = new Map<string, number>();

  for (const tx of transactions) {
    const created = new Date(tx.createdAt);
    if (created < monthStart) continue;

    monthTransactionCount += 1;
    const status = String(tx.status || '').toUpperCase();
    const isSuccess = SUCCESS_STATUSES.has(status);
    if (isSuccess) monthSuccessfulCount += 1;

    const type = String(tx.type || '').toUpperCase();
    if (isSuccess && SERVICE_SPEND_TYPES.has(type)) {
      monthServiceSpendKobo += BigInt(tx.amount || '0');
      serviceTypeCounts.set(type, (serviceTypeCounts.get(type) ?? 0) + 1);
    }
  }

  let topServiceType: string | null = null;
  let topCount = 0;
  for (const [type, count] of serviceTypeCounts) {
    if (count > topCount) {
      topCount = count;
      topServiceType = type;
    }
  }

  return {
    monthTransactionCount,
    monthSuccessfulCount,
    monthServiceSpendKobo,
    topServiceType,
  };
}

export function computeMonthlyInsights(entries: Array<{ type: string; amount: string; createdAt: string }>): MonthlyInsights {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let moneyIn = 0n;
  let moneyOut = 0n;
  let inCount = 0;
  let outCount = 0;

  for (const entry of entries) {
    const created = new Date(entry.createdAt);
    if (created < monthStart) continue;

    const amount = BigInt(entry.amount || '0');
    if (entry.type === 'CREDIT') {
      moneyIn += amount;
      inCount += 1;
    } else if (entry.type === 'DEBIT') {
      moneyOut += amount;
      outCount += 1;
    }
  }

  return { moneyIn, moneyOut, inCount, outCount };
}

export function formatInsightAmount(kobo: bigint, visible = true): string {
  if (!visible) return '••••';
  const naira = Number(kobo) / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(1)}K`;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
