# ADR 0024: Valor de contrato sai de `projects` para tabela-filha

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

`projects.total_value` e o valor de contrato — dado financeiro que, pela regra de
tela, so admin e gerente veem. Mas a coluna morava na tabela que **todo funcionario
precisa ler**: `/my-projects`, o timesheet e o quadro de atividades dependem de
`projects` para nome, datas e status, e `projects` ainda e embutido em dezenas de
consultas (`projects(name)` dentro de `project_members`, `project_timesheets`,
`project_activity_cards`).

RLS e row-level. Aprovada a linha, toda coluna fica legivel. Restringir a tabela
quebraria o funcionario; manter a coluna deixava o valor de contrato exposto a
qualquer membro do tenant via `select('*')` ou consulta direta a API. Nao havia como
resolver isso com policy.

A onda anterior (ADR-0022) alinhou leitura e escrita nas oito tabelas que sao
inteiramente financeiras. Esta ADR fecha o caso que sobrou: uma **coluna** financeira
dentro de uma tabela operacional.

## Decisao

Mover o valor de contrato para `project_financials` (1:1 com `projects`, chave
primaria `project_id`), com RLS de `is_admin_or_manager` — o mesmo predicado do
restante do financeiro de projeto. A coluna e removida de `projects`.

E o mesmo movimento do ADR-0020 para remuneracao em `employees`: **quando a protecao
precisa ser por coluna e RLS e por linha, a coluna muda de lugar.**

Decisoes de implementacao:

- **Migracao de dados** no mesmo arquivo, idempotente:
  `INSERT ... SELECT id, COALESCE(total_value, 0) FROM projects ON CONFLICT DO NOTHING`.
  Reexecucao parcial nao perde valor ja gravado.
- **Trigger `create_project_financials`** em `AFTER INSERT ON projects` garante que
  nao existe projeto sem linha financeira, inclusive nos caminhos que nao passam pelo
  frontend (Edge Function de seed, importacao futura).
- **Contrato do frontend preservado.** Os 19 consumidores leem `project.total_value`
  e **nao foram alterados**: as quatro consultas de `projectService` e a do portfolio
  passaram a embutir `financials:project_financials(total_value)` e a reexpor o campo
  na raiz (`withTotalValue`). Trocar 5 consultas em vez de 19 telas reduz muito o
  risco de errar numero em KPI, PDF e wizard de parcelas.
- **Consequencia desejada da reexposicao:** quem nao pode ver o financeiro recebe
  `0`, porque a RLS da tabela-filha nao devolve a linha. O campo existe, o valor nao.
- **`simulate_allocation_margin_impact`** era o unico objeto SQL que referenciava a
  coluna. Foi reemitida com a leitura da receita trocada por `LEFT JOIN
  project_financials`; as outras ~90 linhas do corpo foram extraidas e reemitidas
  programaticamente, sem transcricao manual. A funcao e `SECURITY INVOKER` e ja
  validava `has_role(admin) OR can_manage_project`, entao a RLS da nova tabela nao a
  restringe alem do que ela ja restringia.
- **`DROP COLUMN` sem `CASCADE`**, de proposito: se algum objeto ainda depender da
  coluna, a migration falha e o problema aparece na aplicacao, em vez de uma
  dependencia ser removida em silencio.

## Consequencias

- Beneficios:
  - Valor de contrato deixa de ser legivel por funcionario comum. A regra da tela
    passa a ser a regra do banco, o que era o objetivo do epico PUL-161.
  - `projects` volta a ser uma tabela sem dado financeiro — proteger o que sobra
    fica mais simples.
- Custos:
  - Uma consulta embutida a mais nas leituras de projeto (dentro do mesmo round-trip
    do PostgREST).
  - Quem for exibir valor de contrato em tela nova precisa embutir a tabela-filha; ler
    `projects` nao traz mais o campo.
- Riscos:
  - Se um consumidor nao mapeado esperava `total_value` direto da tabela, passa a ver
    `0`. A varredura cobriu `src/` (19 consumidores, todos alimentados pelas 5
    consultas ajustadas), `supabase/migrations` (1 funcao) e
    `supabase/functions` (`seed-demo-tenant`, ajustado para gravar na filha).
  - `0` como valor de negacao e ambiguo com "projeto sem valor definido". Aceito
    porque nenhuma tela de funcionario exibe o campo; para telas de gestor a RLS
    devolve o valor real.
- Como reverter:
  - `ALTER TABLE projects ADD COLUMN total_value numeric`, copiar de volta
    (`UPDATE projects p SET total_value = pf.total_value FROM project_financials pf
    WHERE pf.project_id = p.id`), restaurar a versao anterior de
    `simulate_allocation_margin_impact` e reverter os 5 pontos de consulta.

## Residuo

`cost_per_hour` em `project_timesheets` e `project_member_months` segue no mesmo
problema de coluna. O caminho seguro ja existe e e mais barato: as RPCs
`get_allocation_employee_detail` / `_month_summary` retornam **somente horas**, sem
custo. O conserto e restringir o SELECT dessas duas tabelas a admin/gerente **ou a
propria linha** e migrar `useMyProjectDetail` para a RPC — um funcionario ver o
proprio `cost_per_hour` nao e vazamento, e dado dele.

## Evidencias

- Migration: `supabase/migrations/20260817240000_project_total_value_to_child_table.sql`
- Frontend: `src/services/projectService.ts` (`withTotalValue`, 4 consultas, create/update),
  `src/hooks/usePortfolioProjects.ts`
- Edge Function: `supabase/functions/seed-demo-tenant/index.ts`
- Jira: PUL-164 (2a onda), epico PUL-161
- Relacionado: ADR-0020 (mesmo padrao para remuneracao), ADR-0022 (1a onda do financeiro)
- Verificacao: `npx tsc --noEmit`, `npx eslint` (sem regressao sobre a baseline) e
  `npm run build` limpos. Varredura confirmou nenhuma leitura/escrita remanescente de
  `projects.total_value`.
- Prova pendente: a migracao de dados e o `DROP COLUMN` nao foram exercitados —
  ambiente Supabase local bloqueado. **Esta e a migration mais sensivel da onda: ela
  move dado e remove coluna.** Aplicar primeiro em ambiente nao produtivo e conferir
  `SELECT count(*) FROM project_financials` contra `count(*) FROM projects` antes de
  promover.
