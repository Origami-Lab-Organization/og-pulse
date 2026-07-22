# ADR 0010: Flag "aloca em projetos" no cadastro de funcionário

- Status: proposto
- Data: 2026-07-22
- Decisores: Origami Lab / operação interna

## Contexto

O Admin precisa cadastrar toda a folha da empresa — incluindo colaboradores
que estruturalmente não fazem trabalho projetizado/faturável (RH,
financeiro, backoffice) — sem que isso polua os pontos de alocação de
projeto. Hoje `employees` não tem nenhum campo que distinga "colaborador
alocável em projeto" de quem não é: `cargo` é texto livre, `tipo_contratacao`
e `system_role` não bloqueiam alocação.

Mapeamento do estado atual (via investigação de código):

- O seletor "Adicionar a um projeto" (`AddAllocationDialog.tsx` →
  `AllocationComposer.tsx`) lista todo funcionário retornado por
  `useEmployees()`, que só filtra por `status` (exclui arquivado/desligado).
- A RPC `get_allocation_employee_month_summary`
  (`supabase/migrations/20260619170000_complete_role_allocations_cutover.sql`,
  CTE `employee_scope`) traz todo o tenant sem filtro de status/tipo quando
  vista em modo "tenant inteiro" — alimenta a grade "Alocação da Equipe" e o
  Capacity Planner (`useTenantMonthlyCapacitySummary`).
- `payrollCalculator` (`calculatePayrollCost`/`calculateLoadedPersonnelCost`)
  e `turnoverCalculator` já filtram só por `status='ativo'`, independente de
  papel/tipo — não devem ser tocados por esta decisão.
- Cadastro/edição de funcionário (`/employees/new`, `/employees/:id`) é
  liberado por `RoleProtectedRoute requireManager` — qualquer colaborador com
  `is_gerente=true` ou admin pode criar/editar a ficha, não só admin.

Alternativas consideradas:

1. **Detecção automática** por histórico de lançamento de timesheet (ex.:
   sem lançamento em N dias → oculto). Rejeitada: cria zonas cinzentas
   (colaborador novo, afastado, ou que só lança no fim do mês) e comportamento
   não determinístico para o Admin planejar a folha.
2. **Híbrido** (flag manual + painel de auditoria de divergência). Rejeitada
   por escopo — pode ser revisitada se o flag manual divergir muito da
   realidade operacional no futuro.
3. **Flag manual, admin-only, com bloqueio se houver alocação ativa**
   (escolhida).

## Decisão

1. **Campo novo**: `employees.aloca_em_projetos boolean not null default
   true`. Default `true` preserva o comportamento atual para todo
   colaborador existente; o Admin desmarca proativamente quem não deve
   entrar nos pontos de alocação.
2. **Escopo do filtro** — aplicado em exatamente 3 superfícies:
   - Seletor "Adicionar a um projeto" (`AllocationComposer`).
   - Grade "Alocação da Equipe" e `get_allocation_employee_month_summary`
     (filtro `AND e.aloca_em_projetos = true` na CTE `employee_scope`, antes
     do bloco `OR EXISTS (...)` de escopo por manager/project/team).
   - Capacity Planner (`useTenantMonthlyCapacitySummary`, mesma RPC).
   Folha de pagamento, headcount e turnover **não são alterados** — continuam
   contando por `status`, não por este campo.
3. **Autorização por campo, não por tela**: diferente do resto da ficha do
   funcionário (editável por qualquer gestor via `requireManager`), apenas
   `system_role = 'admin'` pode alterar `aloca_em_projetos`. Mesmo padrão de
   defesa em profundidade do ADR-0003: UI desabilita o campo para não-admin,
   e a regra real fica em RLS/trigger na tabela `employees` — não confiar
   apenas na UI.
4. **Bloqueio de estado inconsistente**: não é permitido alterar
   `aloca_em_projetos` de `true` para `false` enquanto existir alocação ativa
   do colaborador em `project_role_allocations`. A validação ocorre no
   backend (trigger ou RPC dedicada) e retorna erro estruturado listando os
   projetos pendentes de desalocação — a UI não deve ser a única barreira.
5. **Dados históricos são preservados**: a reclassificação não reescreve
   nem oculta relatórios/analytics de períodos anteriores à mudança — afeta
   apenas candidatura a novas alocações e a visão atual de capacidade/grade.

## Consequências

- Benefícios:
  - Admin cadastra 100% da folha sem ruído nos fluxos de alocação de
    projeto, sem introduzir heurística/comportamento não determinístico.
  - Reaproveita o padrão de autorização por recurso já validado no ADR-0003
    (RLS como borda real, UI como camada de conveniência).
  - Não toca em cálculo financeiro (payroll/turnover), reduzindo risco de
    regressão em regra de negócio sensível.
- Custos:
  - Autorização por campo (não por tela) é um padrão novo neste projeto —
    exige RLS/trigger específico em vez de reaproveitar a checagem de rota
    existente (`requireManager`).
  - Todo novo ponto de leitura de alocação futuro precisa lembrar de aplicar
    o filtro `aloca_em_projetos = true` (não há guarda estrutural única —
    ver Riscos).
- Riscos:
  - Se um novo relatório/tela de alocação for criado sem reaplicar o filtro,
    a inconsistência volta silenciosamente. Mitigação: revisar este ADR e o
    domain-glossary.md no checklist de PR quando a tela tocar em
    `employee_scope`/`project_role_allocations`.
  - **Materializado em 2026-07-22** (ver TD-0009): uma alteração manual de
    `get_allocation_employee_month_summary` direto no SQL Editor (fora de
    migration, feita durante um fix paralelo de visibilidade de PM) apagou o
    filtro `aloca_em_projetos` sem deixar rastro. Corrigido em
    `20260722150000_reapply_aloca_em_projetos_allocation_filter.sql`, que
    reconstrói a função a partir do estado real de produção (preservando o
    fix de PM) e reinsere o filtro.
  - Bloqueio de desmarcação com alocação ativa pode frustrar o Admin em
    reorganizações grandes (precisa desalocar manualmente primeiro); aceito
    como trade-off para evitar estado inconsistente.
- Como reverter:
  - Migration é aditiva (`aloca_em_projetos` com default `true`): remover a
    coluna e os filtros aplicados nas 3 superfícies restaura o comportamento
    atual sem perda de dados.

## Evidências

- Investigação de código desta sessão: `src/hooks/useEmployees.ts`,
  `src/components/projects/detail/equipe/AddAllocationDialog.tsx`,
  `src/components/projects/detail/equipe/AllocationComposer.tsx`,
  `supabase/migrations/20260619170000_complete_role_allocations_cutover.sql`
  (CTE `employee_scope`), `src/lib/payrollCalculator.ts`,
  `src/lib/turnoverCalculator.ts`, `src/components/auth/RoleProtectedRoute.tsx`.
- Decisão de mecanismo (manual vs. automático) e de permissão (admin-only)
  confirmadas explicitamente pelo Admin nesta sessão.
- `.harness/domain-glossary.md` — entrada "Aloca em projetos" adicionada
  nesta mesma sessão.
- Implementação: `supabase/migrations/20260722090000_employee_allocation_eligibility.sql`
  (coluna, triggers, RPC) e `20260722150000_reapply_aloca_em_projetos_allocation_filter.sql`
  (reaplicação do filtro após drift manual — ver TD-0009); UI em
  `src/pages/EmployeeCreate.tsx`/`EmployeeDetail.tsx`; filtro propagado em
  `AddAllocationDialog`, `AddRoleDialog`, `ProjectTeamSection`,
  `ProjectLaborSection`, `usePayrollHistory`/`payrollHistory.ts` (Custo x Hora).
- TD-0009 (`.harness/tech-debt/log.md`) — incidente de drift de schema fora
  de migration que apagou este filtro; risco de processo ainda aberto.
