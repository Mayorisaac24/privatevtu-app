export type DisputeReason =
  | 'NOT_RECEIVED'
  | 'WRONG_AMOUNT'
  | 'DUPLICATE_CHARGE'
  | 'FAILED_BUT_DEBITED'
  | 'PROVIDER_ERROR'
  | 'UNAUTHORIZED'
  | 'OTHER';

export type DisputeStatus =
  | 'OPEN'
  | 'AWAITING_USER'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  slug: string;
  title: string;
  items: FaqItem[];
}

export interface SupportConfig {
  supportEmail: string;
  supportPhone: string | null;
  supportWhatsapp: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  appName: string;
}

export interface DisputeRecord {
  id: string;
  reference: string;
  transactionId: string | null;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  transaction?: {
    id: string;
    reference: string;
    type: string;
    status: string;
    formattedAmount: string;
  } | null;
  messages?: Array<{
    id: string;
    authorType: string;
    authorName?: string | null;
    body: string;
    createdAt: string;
  }>;
}

export function formatDisputeAgentName(agent?: { firstName: string; lastName: string } | null) {
  if (!agent) return null;
  const full = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
  return full || null;
}

export const DISPUTE_REASONS: Array<{ value: DisputeReason; label: string; hint: string }> = [
  { value: 'NOT_RECEIVED', label: 'Service not received', hint: 'Airtime, data, or bill payment did not arrive' },
  { value: 'WRONG_AMOUNT', label: 'Wrong amount', hint: 'Charged a different amount than expected' },
  { value: 'DUPLICATE_CHARGE', label: 'Duplicate charge', hint: 'Wallet debited more than once for the same purchase' },
  { value: 'FAILED_BUT_DEBITED', label: 'Failed but debited', hint: 'Transaction failed but money was taken' },
  { value: 'PROVIDER_ERROR', label: 'Provider error', hint: 'Provider returned an error or invalid token' },
  { value: 'UNAUTHORIZED', label: 'Unauthorized transaction', hint: 'I did not authorize this transaction' },
  { value: 'OTHER', label: 'Other issue', hint: 'Describe your issue in detail below' },
];

export function disputeStatusLabel(status: DisputeStatus) {
  switch (status) {
    case 'OPEN': return 'Open';
    case 'AWAITING_USER': return 'Awaiting your reply';
    case 'IN_REVIEW': return 'Under review';
    case 'RESOLVED': return 'Resolved';
    case 'REJECTED': return 'Rejected';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

import { DisputeStatusColors } from '../theme/colors/app-colors';

export function disputeStatusColor(status: DisputeStatus) {
  switch (status) {
    case 'RESOLVED': return DisputeStatusColors.RESOLVED;
    case 'REJECTED': return DisputeStatusColors.REJECTED;
    case 'AWAITING_USER': return DisputeStatusColors.AWAITING_USER;
    case 'IN_REVIEW': return DisputeStatusColors.IN_REVIEW;
    case 'OPEN': return DisputeStatusColors.OPEN;
    default: return DisputeStatusColors.default;
  }
}
