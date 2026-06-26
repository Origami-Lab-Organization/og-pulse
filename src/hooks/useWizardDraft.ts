import { useCallback } from 'react';
import { WizardDraft } from '@/components/services/wizard/types';

const draftKey = (tenantId: string) => `og-pulse:service-wizard-draft:${tenantId}`;

export function useWizardDraft(tenantId: string | undefined) {
  const getDraft = useCallback((): WizardDraft | null => {
    if (!tenantId) return null;
    const raw = localStorage.getItem(draftKey(tenantId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WizardDraft;
    } catch {
      return null;
    }
  }, [tenantId]);

  const saveDraft = useCallback(
    (draft: WizardDraft) => {
      if (!tenantId) return;
      localStorage.setItem(draftKey(tenantId), JSON.stringify(draft));
    },
    [tenantId]
  );

  const clearDraft = useCallback(() => {
    if (!tenantId) return;
    localStorage.removeItem(draftKey(tenantId));
  }, [tenantId]);

  return { getDraft, saveDraft, clearDraft };
}
