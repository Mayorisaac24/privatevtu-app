import { Colors } from '../theme';
import type { Transaction } from './api';
import { formatAccountNumberDisplay } from './transfer-banks';

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

const TYPE_META: Record<string, Omit<TxDisplayMeta, 'isCredit'>> = {
  AIRTIME: { icon: 'phone-portrait-outline', label: 'Airtime', bgColor: Colors.airtimeBg, iconColor: Colors.airtime },
  DATA: { icon: 'wifi-outline', label: 'Data', bgColor: Colors.dataBg, iconColor: Colors.data },
  ELECTRICITY: { icon: 'flash-outline', label: 'Electricity', bgColor: Colors.electricityBg, iconColor: Colors.electricity },
  CABLE: { icon: 'tv-outline', label: 'Cable TV', bgColor: Colors.cableBg, iconColor: Colors.cable },
  TRANSFER: { icon: 'paper-plane-outline', label: 'Transfer', bgColor: Colors.transferBg, iconColor: Colors.transfer },
  WITHDRAWAL: { icon: 'paper-plane-outline', label: 'Bank Transfer', bgColor: Colors.transferBg, iconColor: Colors.transfer },
  WALLET_FUND: { icon: 'wallet-outline', label: 'Wallet Funding', bgColor: Colors.successLight, iconColor: Colors.success },
  EDUCATION: { icon: 'school-outline', label: 'Education', bgColor: Colors.educationBg, iconColor: Colors.education },
};

function normalizeStatus(status?: string): DisplayStatus {
  const value = String(status || '').toLowerCase();
  if (value === 'successful' || value === 'success' || value === 'completed') return 'successful';
  if (value === 'failed' || value === 'reversed') return 'failed';
  if (value === 'processing') return 'processing';
  return 'pending';
}

function normalizeCategory(type: string): string {
  const normalized = String(type || '').toUpperCase();
  if (['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE'].includes(normalized)) return 'services';
  if (normalized === 'WALLET_FUND') return 'wallet_funding';
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
  const displayStatus = normalizeStatus(tx.displayStatus || tx.status);
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
    } else if (txType === 'WALLET_FUND') {
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
    if (phone && network) {
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
    } else if (['AIRTIME', 'DATA'].includes(txType)) {
      logoType = 'provider';
      logoKey = network.toLowerCase();
    } else {
      logoType = 'service';
      logoKey = network.toLowerCase() || txType.toLowerCase();
    }
  }

  const isCredit = txType === 'WALLET_FUND' || Boolean(tx.isCredit);

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
    label: enriched.displayTitle || base.label,
    isCredit: enriched.type === 'WALLET_FUND' || Boolean(enriched.isCredit),
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
  const isFunding = tx.type === 'WALLET_FUND';
  const prefix: '+' | '-' = isFunding || tx.isCredit ? '+' : '-';
  if (status === 'failed') return { prefix, color: Colors.error };
  if (isFunding) return { prefix, color: Colors.success };
  return { prefix, color: Colors.dark };
}

export function dedupeTransactionsForDisplay<T extends { id: string; type: string; reference: string }>(
  rows: T[],
): T[] {
  const withdrawalRefs = new Set(
    rows.filter((row) => row.type === 'WITHDRAWAL').map((row) => row.reference),
  );
  const seen = new Set<string>();

  return rows.filter((row) => {
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
        bg: '#EEF2FF',
        text: '#4338CA',
        dot: '#6366F1',
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
