import { RevenueModelType } from '@/types/serviceRevenueModel';

export interface WizardLineData {
  name: string;
  description?: string;
}

export interface WizardServiceData {
  name: string;
  description?: string;
}

export interface WizardModelData {
  modelType: RevenueModelType;
  period?: string;
}

export interface WizardDraft {
  step: 1 | 2 | 3;
  lineData: WizardLineData | null;
  serviceData: WizardServiceData | null;
  savedAt: string;
}
