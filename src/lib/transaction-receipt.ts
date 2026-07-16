import type { SupportConfig } from './support';
import { resolveAppName, DEFAULT_SUPPORT_EMAIL } from './brand';
import type { EnrichedTransaction } from './transaction-display';
import {
  enrichTransaction,
  formatTransactionDateTime,
  getStatusMeta,
  getTransactionFeeKobo,
  getWalletFundingFeeKobo,
  getWalletFundingGrossAmountKobo,
} from './transaction-display';
import { formatCurrencyVisible } from './api';
import { formatAccountNumberDisplay, resolveTransferBankForDisplay } from './transfer-banks';
import { formatBettingPlatformLabel } from './betting-platforms';

export type ReceiptRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type TransactionReceiptData = {
  appName: string;
  supportEmail: string;
  title: string;
  amount: string;
  statusLabel: string;
  statusTone: 'successful' | 'failed' | 'processing' | 'pending';
  dateTime: string;
  paymentMethod: string;
  reference: string;
  rows: ReceiptRow[];
};

function readMetaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function formatPaymentMethod(type: string): string {
  switch (String(type || '').toUpperCase()) {
    case 'WITHDRAWAL':
    case 'TRANSFER':
      return 'Bank transfer';
    case 'WALLET_FUND':
    case 'ADMIN_CREDIT':
      return 'Wallet funding';
    case 'AIRTIME':
      return 'Airtime';
    case 'DATA':
      return 'Data';
    case 'ELECTRICITY':
      return 'Electricity';
    case 'CABLE':
      return 'Cable TV';
    case 'EDUCATION':
      return 'Education PIN';
    case 'BETTING':
      return 'Betting';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

/**
 * Customer-facing share receipt — proof of purchase only.
 * Omits wallet internals (balance, discounted debit) that belong on the in-app detail screen.
 */
export function buildTransactionReceiptData(
  tx: EnrichedTransaction,
  config?: Pick<SupportConfig, 'appName' | 'supportEmail'> | null,
): TransactionReceiptData {
  const enriched = enrichTransaction(tx);
  const txType = String(enriched.type || '').toUpperCase();
  const metadata = enriched.metadata;
  const statusMeta = getStatusMeta(enriched.displayStatus || enriched.status);
  const displayAmount = enriched.displayAmountKobo || enriched.displayAmount || enriched.amount;
  const feeKobo = getTransactionFeeKobo(enriched);
  const isWalletFund = txType === 'WALLET_FUND';
  const fundingFeeKobo = isWalletFund ? getWalletFundingFeeKobo(enriched) : feeKobo;
  const fundedAmountKobo = isWalletFund
    ? (getWalletFundingGrossAmountKobo(enriched)
      ?? (BigInt(fundingFeeKobo || '0') > 0n
        ? (BigInt(displayAmount) + BigInt(fundingFeeKobo)).toString()
        : null))
    : null;
  const fundingBreakdown = isWalletFund && fundedAmountKobo != null;
  const isTransfer = txType === 'WITHDRAWAL' || txType === 'TRANSFER';
  const transfer = enriched.transferDetails;
  const rows: ReceiptRow[] = [];

  if (isTransfer) {
    const bankCode = transfer?.bankCode || readMetaString(metadata, 'bankCode') || enriched.logoKey || '';
    const bankName = readMetaString(metadata, 'bankName');
    const bank = bankCode ? resolveTransferBankForDisplay(bankCode, bankName) : null;
    const recipientName = transfer?.accountName
      || readMetaString(metadata, 'accountName')
      || enriched.displayTitle
      || 'Recipient';
    const accountNumber = transfer?.accountNumber || readMetaString(metadata, 'accountNumber');

    rows.push({ label: 'Recipient', value: recipientName });
    if (accountNumber) {
      rows.push({
        label: 'Account',
        value: bank
          ? `${bank.shortName || bank.name} · ${formatAccountNumberDisplay(accountNumber)}`
          : formatAccountNumberDisplay(accountNumber),
      });
    } else if (bank) {
      rows.push({ label: 'Bank', value: bank.shortName || bank.name });
    }
    if (transfer?.narration) {
      rows.push({ label: 'Narration', value: transfer.narration });
    }
  } else {
    const phone = enriched.phone || readMetaString(metadata, 'phone');
    if (phone) rows.push({ label: 'Phone / account', value: phone });

    const provider = enriched.provider || readMetaString(metadata, 'providerDisplayName') || readMetaString(metadata, 'provider');
    if (provider) rows.push({ label: 'Provider', value: provider });

    const planName = readMetaString(metadata, 'planName') || readMetaString(metadata, 'bundleName');
    if (planName) rows.push({ label: 'Plan', value: planName });

    const meterNumber = readMetaString(metadata, 'meterNumber');
    if (meterNumber) rows.push({ label: 'Meter number', value: meterNumber });

    const smartcard = readMetaString(metadata, 'smartcardNumber') || readMetaString(metadata, 'smartCardNumber');
    if (smartcard) rows.push({ label: 'Smartcard', value: smartcard });

    const token = readMetaString(metadata, 'token') || readMetaString(metadata, 'electricityToken');
    if (token) rows.push({ label: 'Token', value: token, highlight: true });

    const purchasedPin = readMetaString(metadata, 'purchasedPin');
    if (purchasedPin) rows.push({ label: 'Exam PIN', value: purchasedPin, highlight: true });

    if (txType === 'BETTING') {
      const platformName = readMetaString(metadata, 'platformName')
        || formatBettingPlatformLabel({ code: readMetaString(metadata, 'platform') || provider });
      if (platformName) rows.push({ label: 'Platform', value: platformName });
    }
  }

  if (fundingBreakdown && fundedAmountKobo) {
    rows.push({
      label: 'Amount',
      value: enriched.formattedFundedAmount || formatCurrencyVisible(fundedAmountKobo, true),
      highlight: true,
    });
    if (BigInt(fundingFeeKobo || '0') > 0n) {
      rows.push({
        label: 'Fee',
        value: enriched.formattedFee || formatCurrencyVisible(fundingFeeKobo, true),
      });
    }
    rows.push({
      label: 'Amount credited',
      value: enriched.formattedDisplayAmount || formatCurrencyVisible(displayAmount, true),
    });
  } else {
    rows.push({
      label: isTransfer ? 'Amount sent' : 'Amount',
      value: enriched.formattedDisplayAmount || formatCurrencyVisible(displayAmount, true),
      highlight: true,
    });

    // Transfer fees are disclosed on receipts (regulatory / customer expectation).
    // VTU program discounts are internal — receipt shows face value only.
    if (isTransfer && BigInt(feeKobo || '0') > 0n) {
      rows.push({
        label: 'Transfer fee',
        value: enriched.formattedFee || formatCurrencyVisible(feeKobo, true),
      });
    }
  }

  if (enriched.providerRef) {
    rows.push({ label: 'Provider reference', value: enriched.providerRef });
  }

  return {
    appName: resolveAppName(config?.appName),
    supportEmail: config?.supportEmail || DEFAULT_SUPPORT_EMAIL,
    title: enriched.displayTitle || formatPaymentMethod(txType),
    amount: enriched.formattedDisplayAmount || formatCurrencyVisible(displayAmount, true),
    statusLabel: enriched.displayStatusLabel || statusMeta.label,
    statusTone: statusMeta.tone,
    dateTime: formatTransactionDateTime(enriched.createdAt),
    paymentMethod: formatPaymentMethod(txType),
    reference: enriched.reference,
    rows,
  };
}

export function sanitizeReceiptFilename(reference: string): string {
  return reference.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'receipt';
}
