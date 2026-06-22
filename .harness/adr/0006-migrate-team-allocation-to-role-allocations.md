# ADR 0006: Migrar alocação de equipe do modelo de custo para project_role_allocations

- Status: proposto
- Data: 2026-06-19
- Decisores: Origami Lab / operacao interna

## Atualização 2026-06-19

Foi implementado o cutover operacional de planejamento:

- `project_role_allocations` recebeu snapshot interno `cost_per_hour`.
- RPCs de alocação passam a usar `project_role_allocations` como fonte canônica
  de horas planejadas, mantendo `project_members` apenas para realizados de
  timesheet enquanto o schema de lançamentos ainda depende de `project_member_id`.
- Painel de alocação salva planejado por `allocation_id`.
- Analytics de planejado usa o snapshot novo quando disponível.

A remoção física de `project_members`/`project_member_months` fica pendente até
migrar `project_timesheets` e os fluxos de correção/aprovação/relatórios que ainda
referenciam `project_member_id`.

## Contexto

A equipe de um projeto era gerenciada na aba **Custos** pelo modelo antigo:
`project_members` (employee, role, seniority, hourly_rate, budget_role_id) +
`project_member_months` (month_number relativo ao início, hours, e o snapshot
`cost_per_hour` preenchido por trigger). O custo/margem de mão de obra é derivado
DESSE modelo: `useProjectFinancials` e `useFinancialEvolution` leem
`project_member_months.cost_per_hour`; `ProjectLaborSection` edita as horas ali.

A aba **Equipe** introduziu um modelo novo: `project_role_allocations`
(employee, project, budget_role_id|custom_role_name, year, month, planned_hours;
UNIQUE(employee, project, year, month)). Ele guarda apenas horas planejadas —
**não tem integração de custo** (nenhum snapshot, nenhum cálculo financeiro lê dele).

Problemas que motivam a decisão:

1. A equipe real continua só no modelo antigo; a aba Equipe e a grade "Alocação
   da Equipe" não refletem quem está no projeto a menos que seja re-cadastrado.
2. O RPC `get_allocation_employee_month_summary` soma `project_member_months` E
   `project_role_allocations` (UNION ALL). Se um colaborador existir nos dois,
   as horas **dobram**.
3. Custo/margem depende 100% do modelo antigo; migrar ingenuamente (copiar e
   deletar) quebraria o cálculo financeiro.

## Decisão

Adotar `project_role_allocations` como **fonte única** de alocação de equipe,
migrando os dados do modelo antigo, em **fases** para não quebrar custo/margem nem
duplicar horas:

- **Fase 1 — Backfill + guarda (esta migração):** copiar
  `project_members`+`project_member_months` → `project_role_allocations`
  (convertendo `month_number`→ano/mês via `projects.start_date`), idempotente,
  `ON CONFLICT DO NOTHING` (não sobrescreve alocações já feitas na aba Equipe).
  Junto, adicionar guarda no RPC de resumo: a fonte `project_member_months` passa
  a ser suprimida quando já existe `project_role_allocations` para o mesmo
  (employee, project, year, month) — elimina a dupla contagem após o backfill.
- **Fase 2 — Custo no modelo novo:** levar o custo para `project_role_allocations`
  (snapshot de `cost_per_hour` replicando o trigger atual — abordagem escolhida por
  consistência com o padrão existente). Re-wire de `useProjectFinancials` e
  `useFinancialEvolution`.
- **Fase 3 — Cutover:** RPCs (resumo e detalhe) e cálculos passam a ler apenas o
  modelo novo; aposentar `ProjectLaborSection` (edição de equipe na aba Custos).
- **Fase 4 — Limpeza:** arquivar/deletar `project_members` + `project_member_months`.
  Esta fase depende antes da migração de `project_timesheets`, porque lançamentos
  realizados ainda apontam para `project_members`.

## Consequências

- Benefícios:
  - Equipe deixa de viver em "custo"; uma fonte única (aba Equipe) reflete em todo
    o sistema (grade de alocação, painel do colaborador, planejador de capacidade).
  - Remove a dupla contagem existente no quadro de alocação.
- Custos/Riscos:
  - Mexe em regra financeira (custo/margem) — exige validação manual e, quando os
    testes voltarem, cobertura dedicada antes do cutover (Fase 3).
  - Reconciliação: o modelo novo tem UNIQUE(employee, project, year, month); dois
    `project_members` do mesmo colaborador no mesmo projeto/mês são **somados** no
    backfill (uma alocação por mês). Papéis sem `employee_id` não migram (o modelo
    novo exige employee).
  - Fases 1 e 3 dependem uma da outra para o número bater; entre elas, o custo
    continua lendo o modelo antigo (intencional).
- Como reverter:
  - Fase 1 é aditiva: remover as linhas inseridas por este backfill em
    `project_role_allocations` e restaurar a definição anterior do RPC de resumo.

## Evidências

- Migração: `supabase/migrations/20260619160000_backfill_role_allocations_phase1.sql`
- Cutover/snapshot: `supabase/migrations/20260619170000_complete_role_allocations_cutover.sql`
- Modelo novo: `supabase/migrations/20260413000001_project_roles.sql`, `20260413000002_project_role_allocations.sql`
- RPC com UNION (dupla contagem): `supabase/migrations/20260526144949_*.sql`
- Custo depende do modelo antigo: `src/hooks/useProjectFinancials.ts`, `src/hooks/useFinancialEvolution.ts`, trigger de `cost_per_hour` em `20260519183019_*.sql`
- TD relacionado: cobrir cálculos financeiros com teste antes da Fase 3.
