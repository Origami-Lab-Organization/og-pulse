/** Uma versão do P&L do projeto (US-0033, `ProjectPnLBridge`). */
export interface PnLValues {
  /** Projetado: valor do contrato. Realizado: parcelas recebidas. */
  revenue: number;
  /** Projetado: comissão planejada. Realizado: comissão paga. */
  commission: number;
  labor: number;
  other: number;
}

export type PnLMode = 'projected' | 'realized';
