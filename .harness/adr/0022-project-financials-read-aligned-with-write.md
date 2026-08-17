# ADR 0022: Leitura do financeiro de projeto usa o mesmo predicado da escrita

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

As tabelas financeiras de projeto (`project_costs`, `project_cost_months`,
`project_commissions`, `project_installments`, `project_suppliers`,
`project_supplier_actuals`, `project_supplier_months`, `project_materials`) tinham
SELECT liberado a qualquer membro do tenant, via `user_belongs_to_tenant` alcancado
por join em `projects`. A escrita nessas mesmas tabelas ja exigia
`is_admin_or_manager`.

Ou seja: qualquer funcionario podia **ler** custo, comissao e parcela, e a unica
barreira era a interface — sendo que `/projects/:id` nao tem guard de perfil na rota
(`ProtectedRoute`) e as abas financeiras sao escondidas por condicional de
componente.

## Decisao

SELECT passa a exigir `is_admin_or_manager(auth.uid(), tenant_id)`, o mesmo predicado
que a escrita ja usava. Leitura e escrita ficam alinhadas por tabela.

**`is_admin_or_manager` e nao `can_manage_project`.** A historia original (PUL-164)
sugeria restringir ao PM do projeto. Isso quebraria numero financeiro: o ADR-0002
estabelece que gerente **visualiza** todo o portfolio e **edita** apenas os projetos
onde e o responsavel, e os analytics financeiros (`/analises/financeiro`,
`/admin-dashboard`) somam custo e receita de **todos** os projetos do tenant.
Restringir a leitura a `can_manage_project` faria esses totais sub-reportarem em
silencio para um gerente que nao e PM de tudo — um erro de numero financeiro, pior
que o problema de acesso original.

**Rota `/projects/:id` nao foi fechada.** A historia previa isso, mas
`ProjectDetail.tsx` permite que um membro alocado abra a tela para ver o quadro de
atividades (`canViewActivities` inclui `isMember`). Fechar a rota por perfil tiraria
esse acesso legitimo. Com a leitura negada no banco, o criterio de aceite ("acesso
negado independentemente da tela") ja e satisfeito sem mexer na navegacao.

## Consequencias

- Beneficios:
  - Custo, comissao e parcela deixam de ser legiveis por funcionario comum, com a
    negacao no banco e nao na tela. Mitiga OWASP A01.
  - Leitura e escrita passam a ter o mesmo predicado por tabela, o que remove a
    assimetria que gerava a falsa sensacao de protecao.
  - Analytics financeiro de gerente continua correto (nenhum total muda).
- Custos:
  - `projectService.getById` busca parcelas e e alcancavel por funcionario comum em
    `/my-projects/:id`. O array passa a vir vazio para esse perfil. Nenhuma tela de
    funcionario renderiza campo financeiro, entao nao ha erro — mas e um ponto a
    lembrar se alguem for exibir valor nessa tela no futuro.
- Riscos:
  - Se alguma tela nao mapeada exibir custo/comissao para funcionario comum, o campo
    passa a vir vazio. A varredura cobriu todos os consumidores dessas oito tabelas
    em `src/`, e todos estao em rota admin/gerente.
- Como reverter:
  - Recriar as policies anteriores com `user_belongs_to_tenant` no lugar de
    `is_admin_or_manager`.

## Residuo desta onda

Duas superficies financeiras **nao** foram resolvidas aqui porque exigem restricao
por **coluna**, e RLS e row-level (mesma limitacao que o ADR-0020 enfrentou):

1. `projects.total_value` — funcionario precisa ler a linha do projeto (nome, datas,
   status) em `/my-projects`, entao a tabela nao pode ser restrita.
2. `cost_per_hour` em `project_timesheets` e `project_member_months` — funcionario
   precisa ler as horas dessas tabelas.

Nos dois casos o caminho e o mesmo do ADR-0020: projecao controlada (RPC/diretorio)
ou mover a coluna sensivel para tabela-filha restrita. Fica registrado como proxima
onda, nao como divida silenciosa.

Alem disso, `calculate_employee_hourly_cost_for_month` (residuo da PUL-163) recebeu
guarda **condicional**: valida o tenant apenas quando `auth.uid()` nao e nulo. A
funcao roda em trigger durante escrita do usuario (sessao presente) e em cron/Edge
Function com service role (sessao nula, e ja privilegiado por definicao). Uma guarda
estrita negaria o caminho de service role e quebraria os recalculos de snapshot de
custo.

## Evidencias

- Migration: `supabase/migrations/20260817220000_project_financials_manager_only.sql`
- Jira: PUL-164 (epico PUL-161)
- Relacionado: ADR-0002 (gerente visualiza portfolio, edita o proprio),
  ADR-0020 (limitacao de coluna em RLS), ADR-0021 (guarda de tenant em RPC definer)
- Verificacao: nenhuma mudanca de frontend necessaria; `npx tsc --noEmit` e
  `npm run build` sem regressao.
- Prova pendente: teste negativo em banco depende de Supabase local, hoje bloqueado.
