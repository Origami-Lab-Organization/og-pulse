# ADR 0023: Leitura e escrita por perfil substituem "membro do tenant" nas tabelas sensíveis

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

O levantamento inicial (PUL-161) mostrou 78 tabelas com SELECT liberado a qualquer
membro do tenant (`user_belongs_to_tenant`). Em muitas isso e correto: catalogo de
servicos, tipos de atividade e feriados precisam ser legiveis por qualquer
colaborador para apontar horas. Em outras, o recorte por perfil existia apenas na
interface.

Esta onda cobre quatro historias:

- **PUL-165** parametros de folha e financeiros (`payroll_profiles`, `role_rates`,
  `financial_settings`)
- **PUL-166** oportunidades e orcamentos (`leads`, `budgets`, `budget_versions`)
- **PUL-167** escrita tenant-wide de catalogo e comercial
- **PUL-168** candidaturas e curriculos

Um achado estrutural apareceu durante a implementacao: `strategy_guardrails` e
`lead_activity_log` tinham **dois conjuntos de policies sobrepostos**, herdados de
migrations diferentes. Como policies se somam por OR, o conjunto permissivo anulava
o restritivo — as policies `strategy_guardrails_insert_admin` existiam e nao
surtiam efeito, porque `tenant_isolation_insert` continuava no ar. A correcao ali
nao foi criar policy nova, foi **remover a antiga**.

## Decisao

**Principio: leitura usa o mesmo predicado da escrita.** Onde a escrita ja exigia
perfil e a leitura era tenant-wide, a leitura passa a exigir o mesmo. Onde a escrita
era tenant-wide em dado de catalogo/comercial, passa a exigir perfil. Nenhuma policy
foi enfraquecida.

**PUL-165 — desvio deliberado da historia.** A historia pedia "somente admin". O
alvo implementado e `is_admin_or_manager`, porque esses parametros sao consumidos por
telas `requireManager`: `EmployeeFormDialog`, `EmployeeCreate`, `EmployeeDetail`
(`/employees/*`), `TerminationStep3Payroll` (`/rh/desligamentos`) e `BudgetForm`
(`/budgets/new`) usam aliquotas, tarifa/hora e margem minima para calcular custo e
margem. Restringir a admin quebraria essas telas para gerente — e o objetivo desta
onda e tirar o **funcionario comum**, nao o gerente.

**PUL-167 — escopo reduzido de proposito.** Duas tabelas foram deixadas como estao,
com motivo:

- `notifications` (INSERT tenant-wide): o sistema notifica entre usuarios — gerente
  cria notificacao para o solicitante, solicitante para o aprovador. Restringir por
  perfil quebraria o fluxo de aprovacao. O que falta ali e regra de **recurso**
  ("posso notificar quem?"), que e decisao de produto, nao de RLS.
- `reimbursement_requests` (INSERT tenant-wide): por desenho o proprio colaborador
  cria o pedido. O modulo foi removido do produto (ADR-0007) e a tabela e vestigial.

**PUL-168.** INSERT publico em `job_applications` e preservado (e o formulario
externo Trabalhe Conosco). Leitura e edicao passam a exigir gerente, RH ou admin, e o
bucket `curriculos` passa a incluir o perfil `rh` na leitura — antes so admin/manager,
o que era incoerente com quem faz recrutamento.

**SELECT mantido tenant-wide de proposito** em `services`, `service_lines`,
`activity_types` e `activity_type_employees`: funcionario precisa ler o catalogo para
apontar horas. Apenas a escrita passou a exigir perfil.

## Consequencias

- Beneficios:
  - Funcionario comum deixa de ler parametros de folha, tarifa/hora, margem minima,
    pipeline comercial, orcamentos e candidaturas com CPF.
  - Deixa de poder apagar servico do catalogo, linha de servico, tipo de atividade
    ou vaga.
  - As policies sobrepostas de `strategy_guardrails` e `lead_activity_log` param de
    anular as restricoes que o time ja havia escrito.
- Custos:
  - `LeadHistoryLink` no detalhe de projeto nao renderiza o vinculo com a
    oportunidade para quem nao e admin/gerente. O componente ignora o erro da
    consulta (`const { data: lead } = useQuery`), entao a degradacao e graciosa.
- Riscos:
  - Consumidor nao mapeado dessas tabelas em rota de funcionario passa a receber
    vazio. A varredura cobriu `src/` para todas as tabelas alteradas; os
    consumidores de pipeline estao todos em `/pipeline` e `/budgets/*`
    (`requireManager`), e `lead_activity_log` nao tem leitor no frontend.
- Como reverter:
  - Recriar as policies anteriores com `user_belongs_to_tenant`. Para
    `strategy_guardrails` e `lead_activity_log`, recriar tambem os conjuntos
    `tenant_isolation_*` / "Users can ..." removidos.

## Evidencias

- Migration: `supabase/migrations/20260817230000_rls_role_scoped_reads_and_writes.sql`
- Jira: PUL-165, PUL-166, PUL-167, PUL-168 (epico PUL-161)
- Relacionado: ADR-0020, ADR-0021, ADR-0022 (mesma onda), ADR-0007 (reembolsos removidos)
- Verificacao: nenhuma mudanca de frontend necessaria; `npx tsc --noEmit` e
  `npm run build` sem regressao.
- Prova pendente: teste negativo em banco depende de Supabase local, hoje bloqueado.
