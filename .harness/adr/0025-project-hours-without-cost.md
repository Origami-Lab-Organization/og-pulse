# ADR 0025: Horas de projeto servidas sem custo; linha restrita a gestor ou à pessoa

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

`project_member_months.cost_per_hour` e `project_timesheets.cost_per_hour` guardam
custo/hora do colaborador, derivado de salario e encargos. As duas tabelas tinham
SELECT tenant-wide porque o funcionario precisa ler **horas** delas: a aba Alocacao de
`/my-projects/:id` mostra planejado e realizado por membro, e `/my-projects` soma o
realizado por projeto. RLS e row-level, entao liberar a linha liberava o custo junto.

Este era o ultimo vazamento de coluna do epico PUL-161.

## Decisao

Diferente do ADR-0024, **a coluna nao foi movida**. `cost_per_hour` e preenchido por
triggers `BEFORE INSERT/UPDATE` (`set_project_member_month_cost_per_hour`,
`set_project_timesheet_cost_per_hour`) e recalculado em lote por
`recalculate_employee_cost_snapshots`. Mover exigiria cirurgia em matematica de custo,
onde o erro e silencioso e contamina margem de projeto. Optou-se por:

1. **SELECT restrito a admin/gerente OU a propria linha.** Funcionario ver o proprio
   `cost_per_hour` nao e vazamento: e dado dele, derivado do salario que ele conhece.
   O que fecha e ver o do colega.
2. **Horas de terceiros por RPC `SECURITY DEFINER` com projecao fixa**, autorizada por
   `can_read_project_hours` (admin, gerente do tenant ou membro alocado).

Decisao de implementacao que reduz o risco: as RPCs devolvem **exatamente o mesmo
shape** que as consultas antigas (`project_member_id, month_number, hours` e
`project_member_id, work_date, hours`), menos `cost_per_hour`. A agregacao do frontend
— conversao de `month_number` para mes calendario via `start_date` do projeto e
agrupamento de `work_date` por mes — ficou **inalterada**. Trocou-se a fonte, nao a
logica, para que nenhum numero de hora exibido mude.

`get_project_actual_hours` existe separada porque `/my-projects` soma o realizado por
`project_id`, e um lancamento pode ter `project_id` sem `project_member_id`. Agregar
por membro mudaria o total exibido.

## Consequencias

- Beneficios:
  - Fecha o ultimo vazamento de coluna do epico. Custo/hora de colega deixa de ser
    legivel por funcionario comum.
  - `project_member_months` tinha **duas policies SELECT sobrepostas** de migrations
    diferentes; como policies somam por OR, a mais permissiva prevalecia. As duas
    foram removidas.
- Custos:
  - Duas leituras de horas passam por RPC em vez de tabela. Tela nova que precise de
    horas de terceiros deve usar as RPCs, nao `select` direto.
- Riscos:
  - Consumidor nao mapeado que leia essas tabelas para linha de terceiro passa a
    receber vazio. Os leitores de `cost_per_hour` restantes
    (`useProjectTimesheets`, `useProjectRoles`, `useAnalyticsData`,
    `useFinancialEvolution`, `useYearlyEvolution`, `useProjectHealthData`,
    `useProjectFinancials`) estao todos em rota admin/gerente, que a policy continua
    atendendo.
- Como reverter:
  - Recriar as policies tenant-wide anteriores e devolver as duas consultas diretas
    nos dois hooks. As RPCs podem permanecer sem efeito colateral.

## Evidencias

- Migration: `supabase/migrations/20260817250000_project_hours_without_cost.sql`
- Frontend: `src/hooks/useMyProjects.ts`, `src/hooks/useMyProjectDetail.ts`
- Jira: PUL-164 (3a onda), epico PUL-161
- Relacionado: ADR-0020 e ADR-0024 (protecao por coluna), ADR-0022 (1a onda)
- Verificacao: `npx tsc --noEmit`, `npm run build` limpos; `npx eslint` identico a
  baseline nos dois hooks (13 e 10 apontamentos preexistentes).
- Prova pendente: teste negativo em banco depende de ambiente Supabase local.
