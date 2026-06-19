# ADR 0005: Alocacao inline no painel do colaborador

- Status: aceito
- Data: 2026-06-19
- Decisores: Origami Lab / operacao interna

## Contexto

O painel de detalhe de alocacao do colaborador (EmployeeAllocationPanel, aberto a
partir da grade de "Alocacao da Equipe") permitia editar horas planejadas, mas as
acoes de "Alocar em Projeto" e "Desalocar" apenas navegavam para
`/projects/:id?tab=team`, tirando o usuario do contexto. Alem disso, o rodape tinha
dois `Select` genericos e visualmente identicos ("Projeto de destino" / "Projeto
para desalocar"), sem rotulo claro do que cada um fazia.

Restricoes consideradas:

- A criacao/remocao de membro de projeto e a edicao de horas planejadas escrevem em
  `project_members` e `project_member_months`, que afetam equipe e custo/margem.
- A edicao de projeto e por recurso (ADR-0002): admin edita tudo; gerente so onde
  `projects.manager_id` apontar para o proprio employee. A RLS ja cobre as duas
  tabelas filhas.
- Nao existe taxonomia de papeis no banco — `project_members.role` e texto livre em
  todo o sistema.

Alternativas: (a) manter a navegacao para a aba de equipe; (b) fazer as acoes inline
no proprio painel.

## Decisao

As acoes passam a ser inline no painel, sem navegacao:

- Desalocar vira acao contextual por linha de projeto (icone na linha + confirmacao
  via AlertDialog), em vez de um Select solto.
- Alocar vira um unico botao "Adicionar a um projeto" que abre um mini-formulario
  inline (projeto + papel + senioridade + horas/mes), reaproveitando o mesmo
  conjunto de dados do fluxo de equipe do projeto (`hourly_rate: 0`, igual ao
  ProjectTeamSection — nao introduz risco novo de custo).
- O campo "Papel no projeto" e um Select alimentado pelos cargos ja em uso na equipe
  (a lista `roles` da grade), com o cargo do colaborador pre-selecionado.
- A regra do ADR-0002 e refletida na UI: `canEditProject = isAdmin || manager_id ===
  usuario logado`. Projetos de outro gestor ficam somente-leitura (pilula desabilitada,
  cadeado, sem botao de desalocar) e o seletor de alocacao lista apenas projetos sob
  gestao do usuario. Ha defesa em profundidade nos handlers (save/alocar/desalocar),
  mas a borda real continua sendo a RLS.
- Operacoes novas no `allocationService` (`allocateToProject`/`deallocateFromProject`)
  e hooks dedicados (`useAllocateEmployeeToProject`/`useDeallocateEmployeeFromProject`)
  que invalidam as queries de alocacao (grade + painel).

## Consequencias

- Beneficios:
  - Fluxo de alocacao sem trocar de pagina; rodape sem os dois selects ambiguos.
  - A autorizacao por recurso fica visivel e consistente com o detalhe do projeto.
- Custos:
  - O painel passou a escrever em `project_members`/`project_member_months`
    diretamente (antes so navegava), aumentando a superficie a manter.
- Riscos:
  - Membro recem-adicionado so aparece no painel apos ter horas/timesheet no mes
    (limitacao do RPC de detalhe); por ora confiamos no toast + invalidacao da grade.
  - Papel vem dos cargos da equipe, nao de papeis especificos de projeto (ver TD).
- Como reverter:
  - Restaurar os botoes que navegavam para `/projects/:id?tab=team` e remover as
    operacoes inline + hooks.

## Evidencias

- src/components/allocation/EmployeeAllocationPanel.tsx
- src/services/allocationService.ts (allocateToProject / deallocateFromProject / getProjectOptions com manager_id)
- src/hooks/useEmployeeAllocationPanel.ts (hooks de alocar/desalocar)
- src/types/allocation.ts (AllocationProjectOption com managerId)
- Regra de acesso herdada do ADR-0002 e RLS em migration 20260526110000_project_pm_portfolio_access.sql
