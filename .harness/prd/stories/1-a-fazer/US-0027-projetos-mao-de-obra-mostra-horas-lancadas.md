# US-0027 — A seção Mão de Obra mostra as horas lançadas

- **Status:** A fazer
- **Tipo:** bug
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Custos do projeto
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0025, ADR-0006, TD-0014

## Descrição

**Como** admin ou GP do projeto,
**quero** que a seção Mão de Obra da aba Despesas mostre as horas e o custo realizados de
cada pessoa,
**para** ver quem está consumindo o orçamento de mão de obra e quanto.

### Contexto

A seção Mão de Obra mostra horas e custo realizados zerados mesmo quando há horas
lançadas. O KPI "Custo realizado" da mesma aba conta essas horas, então a tela se
contradiz.

Caso observado em 23/11/2026 no Paraíso: Victor Couto com "60h / 0h" e realizado
R$ 0,00, enquanto a aba Equipe mostra 28h realizadas (1h em out, 27h em nov) e o KPI soma
R$ 3.671,67 de mão de obra.

A causa é a mesma do TD-0014: a seção só reconhece a hora lançada se encontrar a pessoa
na equipe do modelo antigo (`project_members`). Desde o ADR-0006 a equipe é montada pela
aba Equipe (`project_role_allocations`), e o vínculo antigo pode faltar. O defeito afeta
**todo projeto** em que esse vínculo não é encontrado.

### Escopo

- Inclui: horas e custo realizados por pessoa, por mês (linha expandida) e no total da
  seção.
- Não inclui: migrar `project_timesheets` para fora de `project_member_id` (Fase 4 do
  ADR-0006); quem vê a seção (continua admin ou GP do projeto).

## Critérios de aceite

**Cenário 1: horas lançadas aparecem na pessoa**

- **Dado** uma pessoa alocada pela aba Equipe que lançou horas no projeto;
- **Quando** abro a seção Mão de Obra;
- **Então** a coluna Horas mostra planejado / realizado com as horas lançadas;
- **E** a coluna Realizado mostra o custo dessas horas.

**Cenário 2: a seção bate com o KPI**

- **Dado** qualquer projeto;
- **Quando** comparo o Realizado da seção Mão de Obra com a parcela de mão de obra do
  "Custo realizado";
- **Então** os dois são iguais.

**Cenário 3: cada hora no mês certo**

- **Dado** uma hora lançada no dia 1º de um mês;
- **Quando** expando a pessoa;
- **Então** a hora aparece nesse mês, não no anterior.

**Cenário 4: o caso do Paraíso**

- **Dado** o Paraíso com os lançamentos de 23/11/2026;
- **Quando** abro a seção Mão de Obra;
- **Então** Victor Couto mostra 60h / 28h e realizado R$ 3.671,67.

**Cenário 5: horas de quem saiu da equipe**

- **Dado** uma pessoa que lançou horas e depois foi desalocada;
- **Quando** abro a seção;
- **Então** as horas dela continuam no realizado, na linha marcada como desalocada.

## Pontos em aberto

### Hipóteses para validar

- A causa exata no Paraíso ainda precisa de confirmação no banco: falta a linha em
  `project_members`, a hora aponta para outro `project_member_id`, ou a consulta que
  monta a equipe falha em silêncio. A correção esperada (não depender de
  `project.members` para achar a pessoa) cobre as três; o diagnóstico serve para medir
  quantos projetos estão afetados.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - `useProjectLaborBreakdown.ts` monta `memberToEmployee` a partir de `project.members`;
  - `calculateRealizedLaborCost` (`src/lib/roleAllocationCosts.ts:175`) descarta a hora
    quando `memberToEmployee` não tem o `project_member_id`;
  - o KPI de `ProjectCostsTab.tsx` conta a hora pelo `cost_per_hour` gravado nela, sem
    precisar da pessoa;
  - `new Date(timesheet.work_date)` lê a data em UTC: no fuso de Brasília, o dia 1º cai
    no mês anterior;
  - `projectService.getById` ignora o erro da consulta de `project_members`
    (`members ?? []`).
- **Restrições:** custo por pessoa só para admin ou GP do projeto (Nota² do PRD,
  `ProjectCostsTab.tsx`); `financeiro:ler` (capability-matrix §1).
- **Diagnóstico sugerido:** para o projeto, comparar os `project_member_id` distintos de
  `project_timesheets` com os `id` de `project_members`.
- **Provas esperadas:** os cinco cenários; reconciliação seção × KPI.
- **Fora do escopo:** Fase 4 do ADR-0006.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
