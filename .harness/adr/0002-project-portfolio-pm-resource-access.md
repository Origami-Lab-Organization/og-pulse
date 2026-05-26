# ADR 0002: Project portfolio PM resource access

- Status: aceito
- Data: 2026-05-26
- Decisores: Origami Lab / operacao interna

## Contexto

O portfolio de projetos e usado por gerentes para acompanhar a operacao inteira, mas a edicao de dados do projeto deve continuar limitada ao responsavel direto pelo projeto. Antes desta decisao, parte da UI e das policies usava a regra ampla "admin ou manager", permitindo que um gerente editasse projetos de outros PMs.

Como projetos incluem dados financeiros, alocacao, cronograma, custos, comissoes e informacoes comerciais, a autorizacao precisa ser por recurso e tenant, nao apenas por role.

## Decisao

Gerentes podem visualizar todos os projetos do tenant no portfolio. Ao abrir a pagina, o filtro de gerente e iniciado com o proprio usuario para preservar o fluxo de trabalho individual; ao limpar o filtro, o gerente ve todos os projetos.

Admins podem editar qualquer projeto. Gerentes podem editar apenas projetos onde `projects.manager_id` aponta para o proprio employee. Projetos concluidos continuam editaveis apenas por admins. Exclusao/arquivamento permanece admin-only.

A regra e aplicada na UI e em RLS por meio de policies de escrita em `projects` e tabelas filhas do detalhe do projeto.

## Consequencias

- Beneficios:
  - PMs ganham visao operacional completa sem perder isolamento de edicao por projeto.
  - A regra mitiga OWASP A01 porque a permissao e avaliada no recurso especifico.
  - RLS protege o backend mesmo se a UI for manipulada.
- Custos:
  - Policies de projeto ficam mais especificas e exigem manutencao quando novas tabelas filhas forem criadas.
  - Fluxos historicos que dependiam de escrita ampla por manager passam a falhar para projetos de outros PMs.
- Riscos:
  - Componentes antigos que ainda assumem `manager = pode editar tudo` precisam receber `isReadOnly` corretamente.
  - Ambientes precisam aplicar a migration antes de validar o novo comportamento fim a fim.
- Como reverter:
  - Criar nova migration restaurando escrita de managers por tenant e remover a checagem por `manager_id` na UI.

## Evidencias

- Migration: `supabase/migrations/20260526110000_project_pm_portfolio_access.sql`
- Testes esperados: Vitest para filtro inicial do portfolio, filtro de gerente, kanban por PM e detalhe read-only para gerente nao-PM.
