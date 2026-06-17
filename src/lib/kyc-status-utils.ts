import type { KycStatusData } from './api';

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
  needsUpload: boolean;
};

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
    needsUpload: !allSubmitted || anyRejected,
  };
}

export function getTier3ActionLabel(data?: KycStatusData | null): string {
  if (!hasSavedKycAddress(data)) return 'Start Tier 3';
  const summary = getTier3DocumentSummary(data);
  if (summary.anyRejected) return 'Resubmit documents';
  if (summary.allSubmitted && summary.anyPending) return 'View submission';
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
