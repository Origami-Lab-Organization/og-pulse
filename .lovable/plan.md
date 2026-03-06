

## Plano: Comissões avulsas para projetos sem comissão no orçamento (com aprovação admin)

### Contexto
Atualmente, `ProjectCommissionsSection` retorna `null` quando `hasCommission` é `false` (linha 136) -- ou seja, projetos sem `commission_percent` no orçamento simplesmente não mostram nada na aba Comissão. A solicitação é permitir que gerentes criem pagamentos de comissão avulsos mesmo sem comissão definida no orçamento, com fluxo de aprovação admin.

### Mudanças no Banco de Dados

**Migração: adicionar campos de aprovação à tabela `project_commissions`**
- `approval_status` text NOT NULL DEFAULT 'approved' (valores: 'pending', 'approved', 'rejected') -- default 'approved' para manter compatibilidade com comissões existentes geradas pelo orçamento
- `requested_by` uuid (referência ao employee que solicitou)
- `approved_by` uuid (referência ao employee que aprovou/rejeitou)
- `approved_at` timestamptz
- `rejection_reason` text
- Tornar `installment_id` nullable (comissões avulsas podem não ter parcela vinculada)

### Mudanças no Frontend

**1. `src/hooks/useProjectCommissions.ts`**
- Atualizar interface `ProjectCommission` com os novos campos (`approval_status`, `requested_by`, `approved_by`, `approved_at`, `rejection_reason`)
- Adicionar mutation `useCreateManualCommission` para criar comissão avulsa com `approval_status: 'pending'`
- Adicionar mutation `useApproveCommission` para admin aprovar/rejeitar

**2. `src/components/projects/detail/ProjectCommissionsSection.tsx`**
- Remover o `if (!hasCommission) return null` -- sempre renderizar a seção
- Quando `!hasCommission` e `isEditable`:
  - Mostrar card com botão "Solicitar Comissão" (para gerentes)
  - Abrir dialog com campos: Valor, Beneficiário, Justificativa
- Na tabela de comissões, mostrar badge de status de aprovação:
  - `pending` → badge amarelo "Aguardando Aprovação"
  - `approved` → não mostrar badge (comportamento atual)
  - `rejected` → badge vermelho "Rejeitada" com tooltip do motivo
- Comissões pendentes não contam nos totais de "Planejado" e "Pago"

**3. `src/components/projects/detail/ProjectCommissionsTab.tsx`**
- Passar `isAdmin` e `employeeId` para `ProjectCommissionsSection`
- Remover dependência de `totalCommissionValue > 0` para mostrar a seção

**4. Nova UI de aprovação (dentro de `ProjectCommissionsSection`)**
- Quando `isAdmin` e existem comissões com `approval_status: 'pending'`:
  - Mostrar botões "Aprovar" e "Rejeitar" por comissão
  - Dialog de rejeição com campo de motivo obrigatório

### Regras de negócio
- Gerentes podem criar comissões avulsas com status `pending`
- Apenas admins podem aprovar/rejeitar
- Comissões com `approval_status != 'approved'` não contabilizam nos custos/analytics
- Comissões geradas automaticamente pelo orçamento mantêm `approval_status: 'approved'`

### Impacto no Analytics
- Atualizar `useAnalyticsData.ts` para filtrar apenas comissões com `approval_status = 'approved'` ao calcular totais

### Arquivos alterados
1. Migração SQL (novo)
2. `src/hooks/useProjectCommissions.ts`
3. `src/components/projects/detail/ProjectCommissionsSection.tsx`
4. `src/components/projects/detail/ProjectCommissionsTab.tsx`
5. `src/hooks/useAnalyticsData.ts`

