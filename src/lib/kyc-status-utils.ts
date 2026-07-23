import type { KycStatusData } from './api';
import { hasTier2IdentityVerified } from './api';

export const KYC_ID_TYPES = [
  { value: 'NIN_SLIP', label: 'NIN Slip' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'PASSPORT', label: 'International Passport' },
  { value: 'VOTERS_CARD', label: "Voter's Card" },
] as const;

export const KYC_ID_TYPE_VALUES = KYC_ID_TYPES.map((item) => item.value);
export const KYC_ID_TYPE_LABELS = Object.fromEntries(
  KYC_ID_TYPES.map((item) => [item.value, item.label]),
) as Record<string, string>;

export function hasSavedKycAddress(data?: KycStatusData | null): boolean {
  return !!(data?.user.address && data?.user.city && data?.user.state);
}

export function isVirtualCardCreationEligible(data?: KycStatusData | null): {
  ok: boolean;
  reason?: string;
} {
  if (!hasTier2IdentityVerified(data)) {
    return {
      ok: false,
      reason: 'Complete BVN and NIN verification before creating a virtual card.',
    };
  }
  if (!hasSavedKycAddress(data)) {
    return {
      ok: false,
      reason: 'Complete your residential address in KYC before creating a virtual card.',
    };
  }

  const docs = data?.documents ?? [];
  const approvedIdentityDoc = docs.find(
    (doc) => doc.status === 'APPROVED'
      && (
        doc.type === 'SELFIE'
        || doc.type === 'NIN_SLIP'
        || doc.type === 'DRIVERS_LICENSE'
        || doc.type === 'PASSPORT'
        || doc.type === 'VOTERS_CARD'
      ),
  );
  if (!approvedIdentityDoc) {
    return {
      ok: false,
      reason: 'An approved government ID or live face scan is required before creating a card.',
    };
  }

  return { ok: true };
}

function isSubmittedDoc(status?: string): boolean {
  return status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED';
}

export type Tier3DocumentSummary = {
  idDoc?: NonNullable<KycStatusData['documents']>[number];
  proofDoc?: NonNullable<KycStatusData['documents']>[number];
  selfieDoc?: NonNullable<KycStatusData['documents']>[number];
  hasIdSubmission: boolean;
  hasProofSubmission: boolean;
  hasSelfieSubmission: boolean;
  allSubmitted: boolean;
  allApproved: boolean;
  anyPending: boolean;
  anyRejected: boolean;
  anyApproved: boolean;
  needsUpload: boolean;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
};

export function formatKycDocumentStatus(status?: string): string {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'PENDING':
      return 'Pending';
    default:
      return 'Not submitted';
  }
}

export function getKycDocumentStatusStyle(status?: string): 'approved' | 'pending' | 'rejected' | 'muted' {
  switch (status) {
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'PENDING':
      return 'pending';
    default:
      return 'muted';
  }
}

export function getTier3DocumentSummary(data?: KycStatusData | null): Tier3DocumentSummary {
  const docs = data?.documents ?? [];
  const idDoc = docs.find(
    (doc) => KYC_ID_TYPE_VALUES.includes(doc.type as typeof KYC_ID_TYPE_VALUES[number]),
  );
  const proofDoc = docs.find((doc) => doc.type === 'PROOF_OF_ADDRESS');
  const selfieDoc = docs.find((doc) => doc.type === 'SELFIE');
  const hasIdSubmission = !!idDoc && isSubmittedDoc(idDoc.status);
  const hasProofSubmission = !!proofDoc && isSubmittedDoc(proofDoc.status);
  const hasSelfieSubmission = !!selfieDoc && isSubmittedDoc(selfieDoc.status);
  const allSubmitted = hasIdSubmission && hasProofSubmission && hasSelfieSubmission;
  const allApproved = idDoc?.status === 'APPROVED'
    && proofDoc?.status === 'APPROVED'
    && selfieDoc?.status === 'APPROVED';
  const anyPending = idDoc?.status === 'PENDING'
    || proofDoc?.status === 'PENDING'
    || selfieDoc?.status === 'PENDING';
  const anyRejected = idDoc?.status === 'REJECTED'
    || proofDoc?.status === 'REJECTED'
    || selfieDoc?.status === 'REJECTED';
  const anyApproved = idDoc?.status === 'APPROVED'
    || proofDoc?.status === 'APPROVED'
    || selfieDoc?.status === 'APPROVED';
  const approvedCount = [idDoc, proofDoc, selfieDoc].filter((doc) => doc?.status === 'APPROVED').length;
  const pendingCount = [idDoc, proofDoc, selfieDoc].filter((doc) => doc?.status === 'PENDING').length;
  const rejectedCount = [idDoc, proofDoc, selfieDoc].filter((doc) => doc?.status === 'REJECTED').length;

  return {
    idDoc,
    proofDoc,
    selfieDoc,
    hasIdSubmission,
    hasProofSubmission,
    hasSelfieSubmission,
    allSubmitted,
    allApproved,
    anyPending,
    anyRejected,
    anyApproved,
    needsUpload: !allSubmitted || anyRejected,
    approvedCount,
    pendingCount,
    rejectedCount,
  };
}

export function isTier3AwaitingReview(summary: Tier3DocumentSummary): boolean {
  return summary.allSubmitted && summary.anyPending && !summary.anyRejected;
}

export function isTier3SubmissionActive(summary: Tier3DocumentSummary): boolean {
  return summary.allSubmitted && (summary.anyPending || summary.anyRejected || summary.anyApproved);
}

export function getTier3SubmissionHeadline(summary: Tier3DocumentSummary): {
  title: string;
  subtitle: string;
  tone: 'pending' | 'rejected' | 'progress';
} {
  if (summary.anyRejected) {
    return {
      title: 'Resubmission required',
      subtitle: 'One or more documents were rejected. Upload only the rejected items again.',
      tone: 'rejected',
    };
  }
  if (summary.allApproved) {
    return {
      title: 'Verification complete',
      subtitle: 'All documents were approved.',
      tone: 'progress',
    };
  }
  if (summary.anyApproved && summary.anyPending) {
    return {
      title: 'Review in progress',
      subtitle: `${summary.approvedCount} approved · ${summary.pendingCount} still pending review.`,
      tone: 'progress',
    };
  }
  return {
    title: 'Under review',
    subtitle: 'We usually review submissions within 1–2 business days.',
    tone: 'pending',
  };
}

export function isKycDocumentLocked(status?: string): boolean {
  return status === 'PENDING' || status === 'APPROVED';
}

export function kycDocumentNeedsUpload(status?: string): boolean {
  return !status || status === 'REJECTED';
}

export function getTier3ActionLabel(data?: KycStatusData | null): string {
  if (!hasSavedKycAddress(data)) return 'Start Tier 3';
  const summary = getTier3DocumentSummary(data);
  if (summary.anyRejected) return 'Resubmit documents';
  if (summary.allSubmitted && (summary.anyPending || summary.anyApproved)) return 'View submission';
  if (summary.needsUpload) return 'Upload documents';
  return 'Continue Tier 3';
}

export function enrichKycStatusData(data: KycStatusData): KycStatusData {
  const docs = data.documents ?? [];
  const hasId = docs.some(
    (doc) => KYC_ID_TYPE_VALUES.includes(doc.type as typeof KYC_ID_TYPE_VALUES[number])
      && (doc.status === 'PENDING' || doc.status === 'APPROVED'),
  );
  const hasProof = docs.some(
    (doc) => doc.type === 'PROOF_OF_ADDRESS' && (doc.status === 'PENDING' || doc.status === 'APPROVED'),
  );
  const hasSelfie = docs.some(
    (doc) => doc.type === 'SELFIE' && (doc.status === 'PENDING' || doc.status === 'APPROVED'),
  );
  const tier3 = data.tierRequirements?.TIER_3;
  if (!tier3) return data;

  return {
    ...data,
    tierRequirements: {
      ...data.tierRequirements,
      TIER_3: {
        ...tier3,
        requirements: tier3.requirements.map((req) => {
          if (req.id === 'id') return { ...req, completed: hasId };
          if (req.id === 'proof_of_address') return { ...req, completed: hasProof };
          if (req.id === 'selfie') return { ...req, completed: hasSelfie };
          return req;
        }),
      },
    },
  };
}
