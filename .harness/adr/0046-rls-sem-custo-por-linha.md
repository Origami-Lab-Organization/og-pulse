# ADR 0046: RLS sem custo por linha

- Status: aceito
- Data: 2026-10-05
- Decisores: Italo Castro (tech lead)
- Relacionados: harness-core ADR-065 (regra geral), ADR-0021 (RPC definer com guarda de
  tenant), ADR-0027 (capacidade derivada de papel — emendado por este)

## Contexto

"Meu Time" (`/analises/meu-time`) levava segundos para abrir e mostrava uma pessoa já
desligada (Gabriel, saída em 14/09/2026). A investigação mediu a RLS em produção, como o
usuário autenticado (`SET LOCAL ROLE authenticated` + `request.jwt.claims`).

**A tela.** `allocationService.getGrid` chamava `get_allocation_employee_detail` uma vez
por pessoa (17). A RPC é `SECURITY INVOKER` e traz também as horas lançadas: ~250 ms
cada com RLS, 16 ms sem. São ~4,3 s de banco por abertura, para horas que a tela não
mostra. No plano, 130 dos 155 ms estão em `project_actual`: cada dia de timesheet (230
linhas por pessoa) é juntado a `project_role_allocations`, e a policy dessa tabela
(`has_capability`) roda em cada volta.

**A causa comum.** `has_capability(auth.uid(), tenant_id, 'x')` e
`user_belongs_to_tenant(auth.uid(), tenant_id)` são `SECURITY DEFINER`. O planner não
embute função definer, e como ela recebe o `tenant_id` da linha, roda uma vez por linha,
cada vez com uma subconsulta própria. Mesma consulta, mesmo resultado, em
`prospect_company_partners`: **511 ms** com a policy atual, **4 ms** com o filtro escrito
como conjunto (`tenant_id IN (SELECT t.id FROM tenants t WHERE has_capability(uid, t.id, 'x'))`).

**Leitura inteira de cada tabela, com e sem RLS** (usuário admin, tenant principal):

| Tabela | Linhas | Com RLS | Sem RLS |
|---|---:|---:|---:|
| prospect_company_partners | 5.817 | 658 ms | 0,8 ms |
| prospect_companies | 1.512 | 382 ms | 0,8 ms |
| conta_azul_installments | 2.331 | 263 ms | 0,6 ms |
| prospect_stage_changes | 719 | 95 ms | 0,2 ms |
| timesheet_edit_logs | 340 | 72 ms | 0,2 ms |
| project_role_allocations | 650 | 70 ms | 0,2 ms |
| activity_timesheets | 491 | 69 ms | 0,2 ms |
| prospects | 292 | 66 ms | 0,3 ms |
| project_timesheet_submissions | 342 | 62 ms | 0,1 ms |
| project_member_months | 586 | 61 ms | 0,2 ms |
| project_timesheets | 5.699 | 22 ms | 0,9 ms |

`fomento_publico` (19 mil linhas, policy `true`) apareceu com 314 ms na primeira leitura e 2 ms
na segunda: era cache frio, não RLS. Toda medida aqui foi repetida para descartar isso.

`project_timesheets` é barata porque a policy passa por `projects` e o planner a avalia
uma vez por projeto (*hashed SubPlan*). Foi essa a tabela que o ADR-0027 mediu em
03/09, e por isso ele concluiu que não havia risco de desempenho. Nas tabelas em que a
policy usa o `tenant_id` da própria linha, a conclusão não vale.

## Decisão

1. Vale aqui a regra geral do harness-core ADR-065: a policy avalia a permissão uma vez,
   não por linha; mede-se como o usuário; o front faz uma consulta para o conjunto e
   busca só o que a tela mostra; acima de 100 ms medidos como usuário, revisa-se antes do
   merge.
2. **Correção aplicada em "Meu Time"** (sem migration): `allocationService.getPlanningGrid`
   lê o planejado do ano numa consulta paginada a `project_role_allocations`, sob a mesma
   RLS que a RPC `INVOKER` já aplicava, sem `cost_per_hour`. ~44 ms contra ~4,3 s. A
   página corta quem saiu pela mesma régua da RPC de resumo (`isEmployedInMonth`,
   migration 20260908180000).
3. **Reescrita das policies** que chamam `has_capability`/`user_belongs_to_tenant` com o
   `tenant_id` da linha: uma tabela por vez, pela ordem de custo da tabela acima, cada uma
   com paridade provada (mesmas linhas antes e depois, por papel) e teste de acesso
   negado. Cada reescrita é uma migration própria.
   **Forma escolhida:** uma função `SECURITY DEFINER` que devolve os tenants em que o
   usuário logado tem a capacidade, chamando a própria `has_capability` para cada tenant
   candidato (com papel ou override do usuário), e a policy compara
   `tenant_id IN (SELECT <função>('x'))`. **Paridade provada em 05/10/2026**, em
   produção: 63 capacidades × 32 usuários × 3 tenants = 6.048 pares, 0 divergências entre
   o predicado atual e o novo. **Situação:** desenhada e provada, ainda não aplicada; a
   migration aguarda aprovação explícita do tech lead, porque entra em produção no build.

## Consequências

- Benefícios: "Meu Time" abre com uma leitura de ~44 ms. As telas de prospecção e
  Conta Azul ganham uma ordem de grandeza quando as policies forem reescritas.
- Custos: "Meu Time" passa a considerar só o planejado ao montar o time de cada projeto.
  Em 2026, 3 pares pessoa × projeto tinham lançamento sem plano; as 3 pessoas seguem no
  time do GP por outros projetos, e só o filtro "Lei do Bem" deixa de listar uma delas.
- Riscos: reescrever policy muda segurança. Mitigação: paridade por papel e teste de
  acesso negado antes de cada virada (boundaries.md).
- Como reverter: a correção do "Meu Time" é só front (voltar o hook para
  `useAllocationGrid`); cada policy reescrita tem a migration inversa com o predicado
  antigo.

## Evidências

- Medições de 05/10/2026 em produção, via `supabase db query --linked`, com `EXPLAIN
  ANALYZE` como o usuário autenticado.
- `src/services/allocationService.ts` (`getPlanningGrid`), `src/hooks/useAllocationGrid.ts`
  (`useAllocationPlanningGrid`), `src/lib/allocationGrid.ts` (`isEmployedInMonth`).
- Mesmo critério aplicado no front a outras telas, sem migration: Alocação da Equipe sem
  refazer a grade a cada tecla (chave do cache só com o projeto); detalhe da pessoa lendo
  só o resumo (`getSummaryGrid`) em vez da grade com uma RPC por pessoa; detalhe do
  projeto com as leituras em paralelo; portfólio filtrando a busca sobre o cache;
  remetentes de submissão numa consulta só; e paginação nas duas leituras de timesheet
  que cortavam em 1000 linhas (aba Equipe do Prumo Obras – Fase 2 perdia 25 lançamentos).
