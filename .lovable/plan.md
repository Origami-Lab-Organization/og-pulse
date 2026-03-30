

## Plano de Correção da Página de Alocação — P0, P1 e P2

### Status: ✅ Implementado

### P0 — Bugs e problemas críticos de usabilidade
- ✅ P0.1 — Heatmap com faixas corrigidas (>100% vermelho, 91-100% verde, 80-90% amarelo, 1-79% âmbar, 0% cinza)
- ✅ P0.2 — Indicador visual do mês corrente (borda e fundo sutil)
- ✅ P0.3 — Colunas "Pessoa" e "Cargo" sticky à esquerda, "Status" sticky à direita

### P1 — UX de edição inline para PM/Admin
- ✅ P1.1 — Componentes extraídos: AllocationEditableCell, AllocationHeatmapLegend, AllocationKPIBar, AllocationSaveDialog
- ✅ P1.2 — Affordance de edição com ícone Pencil em hover
- ✅ P1.3 — Navegação por Tab entre células editáveis
- ✅ P1.4 — Footer sticky com resumo de alterações pendentes

### P2 — Polimento visual e consistência com o sistema
- ✅ P2.1 — KPI cards no topo (Total, Adequados, Sobrealocados, Subalocados/Ociosos)
- ✅ P2.2 — Tooltips ricos (Shadcn) com dados de capacidade/utilização
- ✅ P2.3 — Dialog de confirmação ao salvar com reason_code + justificativa
- ✅ P2.4 — Badge de escopo (Admin: "Visão da empresa" / Gerente: "Meus projetos")
