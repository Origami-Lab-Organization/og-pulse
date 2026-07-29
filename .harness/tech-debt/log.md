# Log de Divida Tecnica

## Aberto

- Preencher discovery completo do Harness com time, cliente, compliance e restricoes reais.
- Revisar migrations Supabase antigas para identificar decisoes arquiteturais que merecem ADR.
- Confirmar padrao oficial de lock/aprovacao de timesheets e documentar em pattern dedicado se necessario.
- TD-0001: `allocationService.allocateToProject` / `deallocateFromProject` e a regra
  `canEditProject` do EmployeeAllocationPanel ficaram sem teste (testes desativados na
  sessao de 2026-06-19). E logica de negocio + autorizacao por recurso (ADR-0002/0005).
  Cobrir com Vitest: editar/alocar/desalocar habilitado so para admin ou PM dono;
  somente-leitura para gerente nao-PM. Ref ADR-0002 ("detalhe read-only para gerente
  nao-PM" ja consta como teste esperado).
- TD-0003: `useAnalyticsFilterOptions` usa cast `as any[]` na resposta do join
  `projects → employees` porque o Supabase SDK não infere tipos de joins com alias
  (`manager:employees`). Solução: gerar tipos via `supabase gen types` e tipar o
  resultado do join explicitamente. Baixa prioridade — sem impacto funcional ou de segurança.
- TD-0002: "Papel no projeto" no painel de alocacao usa os cargos da equipe como
  sugestao, nao papeis especificos de projeto. Se o time precisar de taxonomia de
  papeis de projeto (ex.: Tech Lead, PO), modelar tabela/enum dedicada no banco —
  candidata a ADR proprio. Mesma limitacao ja existe no ProjectTeamSection (campo livre).
- TD-0003 (ADR-0006): concluir a limpeza final da migracao de alocacao de equipe.
  Fase 1 (backfill + guarda anti-dupla-contagem) escrita em
  20260619160000_backfill_role_allocations_phase1.sql. Fases 2/3 parcialmente
  concluidas em 20260619170000_complete_role_allocations_cutover.sql: snapshot
  `cost_per_hour` no `project_role_allocations`, RPCs de alocacao lendo o modelo
  novo como fonte canonica de planejamento, painel salvando por `allocation_id`
  e analytics planejado usando o snapshot novo. Pendente: Fase 4 — nao deletar
  `project_members`/`project_member_months` ate migrar `project_timesheets`,
  `MonthlyTimesheetView`, `useProjectTimesheets`, fluxos de correcao/aprovacao e
  relatorios que ainda dependem de `project_member_id`.

- TD-0004: `ProjectPlanningOverviewTab` usa `as any` (suprimido com
  `eslint-disable-next-line @typescript-eslint/no-explicit-any`) em dois pontos:
  (1) `.update({ portfolio_stage, status, start_date })` — `portfolio_stage` não consta
  nos overloads gerados do SDK; (2) `.from('notifications' as any).insert(notifications
  as any)` — tabela `notifications` sem tipagem gerada. Workaround: comentários
  `eslint-disable-next-line` nos três locais afetados. Solução definitiva: rodar
  `supabase gen types` para gerar `Database` atualizado; adicionar `portfolio_stage`
  ao mapeamento em `projectService.update`. Status: aberto. Prioridade: baixa —
  sem impacto funcional ou de segurança. Próximo passo: próxima rodada de geração
  de tipos do Supabase.

### TD-001 — cast `as any` em benefitService e toolService
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/services/benefitService.ts`, `src/services/toolService.ts`
- **Impacto**: perda de type-safety nas chamadas ao Supabase client nestes dois services enquanto a dívida existir; sem impacto em runtime pois os retornos são recastados para os tipos corretos (`as unknown as BenefitDB[]`).
- **Causa raiz**: tabelas `benefits` e `tools` criadas via migration ainda não foram aplicadas no ambiente, portanto o `types.ts` gerado automaticamente não as conhece. O Supabase client rejeita `.from('benefits')` e `.from('tools')` no nível de tipo.
- **Próximo passo**: após o PM rodar as migrations no Supabase, executar `supabase gen types typescript --local > src/integrations/supabase/types.ts`, remover o `as any` e o comentário `eslint-disable` de ambos os services. Remover também os casts `as unknown as BenefitDB[]` / `as unknown as ToolDB[]` desnecessários.

### TD-002 — `(employee as any)[field]` no acesso dinâmico a campos versionados
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/pages/EmployeeDetail.tsx`, `src/components/employees/EmployeeFormDialog.tsx`
- **Impacto**: perda de type-safety na comparação de campos versionados; sem impacto em runtime pois os nomes dos campos batem com os da interface `Employee` gerada por `dbToEmployee`.
- **Causa raiz**: o array `versionedFields` usa nomes camelCase do `FormData` (ex: `salarioMensal`, `jornadaDiaria`) que não são reconhecidos pelo TypeScript como índices válidos de `Employee` sem cast explícito.
- **Próximo passo**: tipar `versionedFields` como `Array<keyof Employee & keyof FormData>` e usar uma função de comparação com assinatura tipada, eliminando o cast `as any`.

### TD-003 — cast `as any` em vacationService (tabelas de férias)
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/services/vacationService.ts`, `src/components/inbox/InboxVacationDetail.tsx`
- **Impacto**: perda de type-safety nas chamadas ao Supabase client para `vacation_requests`, `vacation_request_approvals`, `notifications` e `user_roles` enquanto a dívida existir; sem impacto em runtime (retornos recastados para `VacationRequestDB` / `VacationApprovalDB`). A lógica crítica de negócio (saldo e aprovação) está extraída e testada em `src/lib/vacationBalanceCalculator.ts` e `src/lib/vacationApproval.ts`, fora do service.
- **Causa raiz**: tabelas `vacation_requests` e `vacation_request_approvals` criadas em `supabase/migrations/20260619120000_vacation_management.sql` ainda não aplicadas no ambiente, então o `types.ts` gerado não as conhece (mesma situação do TD-001, ver ADR-0003).
- **Próximo passo**: após aplicar a migration no Supabase, rodar `supabase gen types typescript --local > src/integrations/supabase/types.ts`, remover os `as any` e o `eslint-disable` do `vacationService.ts`.

### TD-0008 — cast `as any` em useTimesheetOnboarding (coluna/RPC fora dos tipos gerados)
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/hooks/useTimesheetOnboarding.ts`
- **Impacto**: `supabase/migrations/20260722000000_timesheet_onboarding.sql` adiciona as colunas `employees.timesheet_onboarding_seen`/`timesheet_onboarding_seen_at` e a RPC `complete_timesheet_onboarding()`, mas o `src/integrations/supabase/types.ts` gerado ainda não os conhece (migration não rodada no ambiente/tipos não regenerados). O hook usa `(supabase.from('employees') as any)` e `(supabase.rpc as any)('complete_timesheet_onboarding')` para contornar — mesma situação do TD-0001/TD-0003 (onboarding geral). Sem risco funcional (a query é defensiva: erro/coluna ausente sempre resulta em `seen: true`, nunca força o onboarding indevidamente).
- **Causa raiz**: migration nova ainda não aplicada no ambiente onde os tipos foram gerados pela última vez.
- **Próximo passo**: depois de aplicar a migration, rodar `supabase gen types typescript --local > src/integrations/supabase/types.ts` e remover os casts `as any`.

### TD-0007 — motor de auto-save de timesheet duplicado (linha antiga + hook novo)
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/hooks/useCellAutosave.ts`, `src/components/timesheets/TimesheetWeekRow.tsx`
- **Impacto**: a lógica sensível de auto-save de célula (debounce 2s, flush no blur, retry 5s, anti-flick `editedValuesRef`, cap 12h, guard offline) agora existe em DOIS lugares: extraída no hook `useCellAutosave` (consumido pela nova experiência de `/my-timesheet` e componentes de grade) e ainda inline dentro de `TimesheetWeekRow` (usado por `TimesheetByProject`, `TimesheetByEmployee` e `GlobalSaveIndicator` — telas admin/PM). Risco de divergência futura se uma cópia mudar e a outra não.
- **Causa raiz**: decisão consciente de NÃO refatorar `TimesheetWeekRow` na substituição de `/my-timesheet` — sem rede de testes automatizados no projeto (testes desativados), tocar no motor da linha compartilhada admin/PM traria risco de regressão em código financeiro sem verificação. O hook foi portado verbatim da linha, então as cópias começam idênticas.
- **Próximo passo**: quando houver testes/QA cobrindo `TimesheetByProject` e `TimesheetByEmployee`, refatorar `TimesheetWeekRow` para consumir `useCellAutosave` (mesma extração já validada na nova grade), eliminando a duplicação.

### TD-0006 — LaborCostSection (Custos) não reconcilia com o KPI de custo realizado quando a equipe do projeto já mudou
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/hooks/useProjectLaborBreakdown.ts`, `src/components/projects/detail/costs/LaborCostSection.tsx`
- **Impacto**: o KPI "Custo Incorrido"/"Custo Realizado" (`ProjectFinancialTab.tsx`, `ProjectOverviewTab.tsx`, `ProjectCostsTab.tsx`) agora soma TODOS os timesheets do projeto por `project_id`, incluindo lançamentos cujo `project_member_id` não corresponde a nenhum membro atual (equipe trocada ao longo do projeto — caso real encontrado no projeto "Prumo Obras - Fase 2": R$135.613,01 lançados vs. R$145,12 mostrados antes da correção). `useProjectLaborBreakdown` (detalhamento por pessoa na aba Custos) continua atribuindo custo só a membros atuais — lançamentos órfãos não aparecem em nenhuma linha, então a soma da tabela por pessoa pode ficar menor que o KPI do topo da aba nesses projetos.
- **Causa raiz**: não há hoje um jeito de resolver a identidade (nome do colaborador) de um `project_member_id` que não está mais em `project.members` — precisaria de um registro histórico (ex.: `project_team_rows` com status `deallocated`) mapeado de volta para `employee_id`.
- **Próximo passo**: usar `project_team_rows`/histórico de desalocação para resolver a identidade de membros removidos e adicionar uma linha "Ex-membros" (ou similar) no `LaborCostSection` somando o que não resolve para ninguém atual, fechando a reconciliação centavo a centavo mencionada no comentário de `useProjectLaborBreakdown.ts`.

### TD-0005 — backfill de cost_per_hour não cobre projetos planning/paused
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `supabase/migrations/20260721170000_backfill_active_project_cost_snapshots.sql`, `supabase/migrations/20260721160000_employee_cost_snapshot_admission_termination_window.sql`
- **Impacto**: `project_member_months`/`project_timesheets` de projetos com status `planning`/`paused` mantêm o `cost_per_hour` antigo (sem o recorte de admissão/desligamento) até serem recalculados. Sem impacto na margem exibida hoje para projetos ativos — decisão de escopo explícita (usuário pediu recálculo só para projetos ativos).
- **Causa raiz**: `recalculate_employee_cost_snapshots_for_active_projects()` filtra por `projects.status = 'active'`.
- **Próximo passo**: quando um projeto `planning`/`paused` virar `active`, rodar `SELECT public.recalculate_employee_cost_snapshots(employee_id)` para cada colaborador alocado nele (ou reexecutar a função de backfill, que é idempotente). Considerar futuramente disparar isso automaticamente na transição de status do projeto.

### TD-0009 — Alteração manual de função no Supabase (fora de migration) reverteu filtro de negócio sem deixar rastro
- **Status**: instância corrigida (`20260722150000_reapply_aloca_em_projetos_allocation_filter.sql`); risco de processo continua aberto
- **Prioridade**: alta
- **Arquivos**: `supabase/migrations/20260722150000_reapply_aloca_em_projetos_allocation_filter.sql`, `supabase/migrations/20260722090000_employee_allocation_eligibility.sql` (ADR-0010)
- **Impacto**: durante a sessão de 2026-07-22, alguém rodou `CREATE OR REPLACE FUNCTION public.get_allocation_employee_month_summary` direto no SQL Editor do Supabase (provavelmente ao resolver, em paralelo, o bug de visibilidade de PM que motivou `20260722130000_project_role_allocations_pm_tenant_read.sql`), a partir de uma versão da função anterior ao filtro `aloca_em_projetos` recém-adicionado (`20260722090000`). O `CREATE OR REPLACE` reescreveu a função inteira e apagou o filtro silenciosamente — sem erro, sem aviso, sem nenhuma migration registrando a mudança. Sintoma: colaborador marcado como "não aloca em projetos" continuava aparecendo na grade de Alocação mesmo com o banco e o RLS corretos, confirmado só depois de comparar `pg_get_functiondef()` contra as migrations do repositório.
- **Causa raiz**: alteração de função de banco feita fora do fluxo de migration versionada — viola `.harness/boundaries.md` ("Nao alterar schema Supabase sem migration versionada"). `CREATE OR REPLACE FUNCTION` não avisa sobre divergência com a última versão versionada; drift fica invisível até alguém comparar manualmente.
- **Próximo passo**: nenhuma alteração de função/policy/trigger deve ser aplicada direto no SQL Editor — sempre via migration, mesmo para "correções rápidas" durante debugging em paralelo. Se recorrer, considerar um script de CI que rode `pg_get_functiondef` das funções críticas de alocação/folha e diffe contra o corpo esperado nas migrations, para detectar drift automaticamente.

### TD-0010 — Semana sem nenhum projeto nunca é detectada como "enviada"
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/components/timesheets/weekly/WeeklyTimesheetGrid.tsx` (`allProjectsLocked`)
- **Impacto**: `allProjectsLocked` retorna sempre `false` quando `projects.length === 0`. Um colaborador que só lança horas em atividades internas (sem nenhum projeto alocado naquela semana) nunca vê "Semana enviada" no rodapé, o botão "Enviar semana" nunca desabilita (pode reenviar indefinidamente), e mesmo depois do fix de 2026-07-29 — que passou a usar `allProjectsLocked` como override para travar QUALQUER linha da semana enviada, inclusive atividades nunca tocadas — as células de atividade continuam editáveis indefinidamente para esse perfil, porque o sinal de "semana travada" nunca liga.
- **Causa raiz**: o único sinal de "semana enviada" hoje é agregado a partir de `project_timesheets`/`project_timesheet_submissions`, por projeto. Não existe uma submissão de semana (ou de atividades internas) independente de projeto.
- **Próximo passo**: modelar um sinal explícito de "semana enviada" que não dependa de existir pelo menos um projeto — ex.: submissão por atividade análoga a `project_timesheet_submissions`, ou uma submissão de semana agregada por colaborador. É decisão de produto, não só de código — candidato a ADR se afetar mais de uma tela.

### TD-0001 — `as any` em Edge Functions de alertas de parcelas
- **Status:** aberto
- **Prioridade:** baixa
- **Arquivo:** `supabase/functions/notify-installment-alerts/index.ts`
- **Impacto:** Deno não tem inferência automática das respostas do Supabase JS SDK; os casts `as any` existem nos campos `installment_number`, `value`, `invoice_date` e `projects` dos registros retornados pela query. Sem risco funcional imediato — mas reduz segurança de tipos e pode mascarar erros de schema no futuro.
- **Próximo passo:** Criar interfaces tipadas para as rows de `project_installments` + `projects` no contexto Deno (ou extrair um tipo compartilhado via `supabase gen types`), removendo os casts.

## Resolvido

- Nenhum item registrado ainda.
