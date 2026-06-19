# ADR 0003: Tabela unificada project_costs para custos extra-labor (J9-01)

- Status: aceito (parcialmente superado pela ADR-0004)
- Data: 2026-06-19
- Decisores: Origami Lab / operacao interna (lucas@origamilab.com.br)

> NOTA: a estrategia "tabela nova + manter legado intacto, integracao aditiva,
> sem migracao" foi revista na ADR-0004 (J9-02): os dados legados foram migrados
> para project_costs, as leituras passaram por um service unico e as secoes
> legadas da aba foram removidas. A justificativa da tabela propria (nao misturar
> com o modelo recorrente) permanece valida.

## Contexto

A historia J9-01 pede a reestruturacao da aba Custos com 6 categorias
(supplier, subscription, equipment_rental, material, travel, other), formulario
unificado com valor planejado/realizado, data unica, moeda estrangeira com
conversao para BRL e soft delete. Hoje os custos extra-labor vivem em duas
tabelas com semanticas distintas:

- `project_suppliers`: custo recorrente (monthly_value, start_month, end_month),
  com atuais por mes (`project_supplier_actuals`/`project_supplier_months`) e
  comparacao contra orcamento. Profundamente acoplada ao planejamento, ao budget
  e ao analytics.
- `project_materials`: custo avulso (value, purchase_date, is_realized,
  month_number).

O modelo de campos pedido pela historia (planejado/realizado + data unica +
moeda) nao encaixa no modelo recorrente de `project_suppliers`. Alterar essas
tabelas para acomodar os novos campos misturaria semanticas e arriscaria quebrar
planejamento, orcamento e analytics — que sao codigo financeiro sensivel
(boundaries.md).

Categorias subscription, equipment_rental, travel e other nao tinham nenhuma
superficie no produto — eram a lacuna central da historia.

Alternativas consideradas:
1. Estender as duas tabelas existentes com `category` + colunas de valor/moeda
   (texto literal da historia).
2. Criar uma tabela nova unificada `project_costs`.

## Decisao

Criamos a tabela `project_costs` (migration `20260619120000`) como ledger
unificado dos custos extra-labor, com as 6 categorias, `planned_amount`/
`actual_amount` na moeda original, `original_currency`, `exchange_rate` e os
valores canonicos em BRL (`planned_amount_brl`, `actual_amount_brl`) usados por
todos os totais/graficos. Soft delete via `deleted_at`. RLS espelha o padrao das
tabelas irmas: leitura pelo tenant do projeto, escrita por admin/gerente do
tenant.

As tabelas legadas `project_suppliers` e `project_materials` permanecem
intactas e continuam alimentando planejamento, orcamento e analytics. Nao houve
migracao de dados — o ledger e a superficie go-forward para custos de execucao.
Na aba Custos a integracao e aditiva: as secoes existentes foram preservadas e o
ledger das 6 categorias foi adicionado; os valores de `project_costs` entram nos
totais do resumo financeiro (margem).

Regra de "mes fechado": decidida por data — mes corrente e futuros abertos,
meses anteriores fechados para o GP e editaveis por Admin. Esta regra e um
controle de NEGOCIO/UX aplicado no frontend, nao um controle de seguranca: no
nivel de dados, RLS so distingue admin/gerente do tenant (ambos sao
`is_admin_or_manager`), entao a distincao GP-vs-Admin por mes nao e expressavel
na policy atual sem conhecer o papel exato e a data dentro do RLS.

## Consequencias

- Beneficios:
  - Campos da historia (planejado/realizado/data/moeda/soft-delete) modelados de
    forma limpa, sem poluir o modelo recorrente.
  - Nao quebra planejamento/orcamento/analytics (codigo financeiro sensivel).
  - Cobre as categorias que nao tinham superficie (assinatura, aluguel, viagem).
  - Conversao para BRL persistida — totais e graficos usam um unico valor canonico.
- Custos:
  - Sobreposicao conceitual: "Fornecedor" e "Material" existem tanto nas secoes
    legadas (planejamento) quanto como categorias do ledger (execucao).
  - Custos legados de projetos em andamento nao aparecem no ledger (sem migracao).
- Riscos:
  - A regra de mes fechado por estar no frontend pode ser contornada por chamada
    direta a API por um gerente do tenant. Mitigacao futura: mover a regra para
    RLS/trigger se o fechamento mensal virar controle formal.
- Como reverter:
  - `DROP TABLE public.project_costs;` (cascata remove policies/indices/trigger) e
    remover o `ProjectCostsLedger` da aba. Nenhum dado legado e afetado.

## Evidencias

- Migration: `supabase/migrations/20260619120000_project_costs_table.sql`
- Hook: `src/hooks/useProjectCostItems.ts`
- Helpers/validacao: `src/lib/projectCosts.ts`
- UI: `src/components/projects/detail/ProjectCostsLedger.tsx`,
  `src/components/projects/detail/ProjectCostFormDialog.tsx`
- Integracao: `src/components/projects/detail/ProjectCostsTab.tsx`
- Historia: J9-01
