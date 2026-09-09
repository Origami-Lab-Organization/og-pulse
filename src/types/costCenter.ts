/** Centro de custo (PUL-217): cadastro-base do tenant, âncora de custo e receita (épico PUL-215). */
export interface CostCenter {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCenterFormData {
  name: string;
  description?: string;
}

/** Filtro da lista. Comparar sempre pelo membro. */
export const CostCenterFilter = {
  ACTIVE: 'active',
  ALL: 'all',
} as const;
export type CostCenterFilter = (typeof CostCenterFilter)[keyof typeof CostCenterFilter];

export interface CostCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = novo centro. */
  costCenter: CostCenter | null;
  /** Todos os centros do tenant, para recusar nome repetido antes de bater no banco. */
  existing: readonly CostCenter[];
  onSubmit: (data: CostCenterFormData) => void;
  isSubmitting: boolean;
}

export interface CostCenterSelectProps {
  /** Id do centro escolhido, ou `undefined` no cadastro novo. */
  value?: string;
  onChange: (costCenterId: string) => void;
  disabled?: boolean;
  id?: string;
}

export interface CostCenterRowProps {
  costCenter: CostCenter;
  canEdit: boolean;
  onEdit: (costCenter: CostCenter) => void;
  onToggleActive: (costCenter: CostCenter) => void;
}
