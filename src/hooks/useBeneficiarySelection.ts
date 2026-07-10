import { useCallback, useState } from 'react';
import {
  useBeneficiaryStore,
  type BeneficiaryIdentifierField,
  type BeneficiaryServiceType,
} from '../stores/beneficiary-store';

export type SaveBeneficiaryDraft = {
  serviceType: BeneficiaryServiceType;
  identifier: string;
  identifierField: BeneficiaryIdentifierField;
  provider?: string;
};

export function useBeneficiarySelection(serviceType: BeneficiaryServiceType) {
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
  const [saveDraft, setSaveDraft] = useState<SaveBeneficiaryDraft | null>(null);
  const touchBeneficiary = useBeneficiaryStore((s) => s.touchBeneficiary);

  const handleFieldEdited = useCallback(() => {
    setSelectedBeneficiaryId(null);
  }, []);

  const completePurchase = useCallback(
    (
      identifier: string,
      identifierField: BeneficiaryIdentifierField,
      provider?: string,
    ) => {
      const trimmed = identifier.trim();
      if (selectedBeneficiaryId) {
        touchBeneficiary(selectedBeneficiaryId);
        setSaveDraft(null);
      } else if (trimmed) {
        setSaveDraft({
          serviceType,
          identifier: trimmed,
          identifierField,
          provider,
        });
      } else {
        setSaveDraft(null);
      }
      setSelectedBeneficiaryId(null);
    },
    [selectedBeneficiaryId, serviceType, touchBeneficiary],
  );

  const dismissSaveDraft = useCallback(() => {
    setSaveDraft(null);
  }, []);

  return {
    selectedBeneficiaryId,
    setSelectedBeneficiaryId,
    handleFieldEdited,
    completePurchase,
    saveDraft,
    dismissSaveDraft,
  };
}
