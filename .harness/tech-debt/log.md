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

### TD-0016 — Stack local do Supabase não sobe: replay das migrations falha
- **Status**: aberto
- **Prioridade**: alta
- **Arquivos**: `supabase/migrations/` (falha ao aplicar a migration que cria `activity_types`)
- **Impacto**: `npx supabase start` não conclui — o replay do histórico quebra ao criar `activity_types`. Consequências práticas: ninguém consegue regenerar `src/integrations/supabase/types.ts` localmente (é o que sustenta TD-0008, TD-0011 e TD-0015, todos "cast `as any` até rodar gen types"), não dá para testar migration antes de aplicar, e a skill `db-testing` do Harness não tem ambiente descartável para rodar. Toda validação de RLS e trigger vira inspeção manual de SQL.
- **Causa raiz**: não diagnosticada. O erro aparece ao executar o `CREATE TABLE activity_types`; a migration isolada parece válida, então a hipótese mais provável é ordem/dependência entre migrations antigas ou divergência entre o schema real (evoluído pelo painel do Lovable Cloud) e o histórico versionado — mesma família do TD-0009.
- **Próximo passo**: rodar `npx supabase start --debug` para capturar o erro real do Postgres, e comparar o schema remoto com o replay local (`supabase db diff`). Se a divergência for grande, o caminho provável é uma migration de squash/baseline consolidando o estado atual, o que também destrava a regeneração de tipos.

### TD-0015 — cast `as any` em project_folders e project_files.folder_id
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/services/projectFolderService.ts`, `src/services/projectFileService.ts`
- **Impacto**: a tabela `project_folders` e a coluna `project_files.folder_id` foram criadas em `20260811170000_project_folders.sql`, mas o `src/integrations/supabase/types.ts` gerado ainda não as conhece. Mesma situação de TD-0008/TD-0011 — sem risco funcional (RLS e triggers continuam sendo aplicados pelo Postgres), só a tipagem estática do client fica cega nessas duas bordas. O mapeamento de linha é tipado à mão por `ProjectFolderRow`/`ProjectFileRow`, então o formato esperado está explícito no código.
- **Causa raiz**: **não há caminho para regenerar os tipos hoje.** Verificado em 2026-08-11: o caminho local falha porque a stack não sobe (TD-0016), e o remoto (`npx supabase gen types typescript --project-id vkriobpmolgopbbpqeky`) responde `Your account does not have the necessary privileges to access this endpoint` — o projeto é gerenciado pelo Lovable Cloud e a conta não tem acesso à API de plataforma do Supabase (mesma limitação registrada no ADR-0016 sobre o dashboard bruto). As migrations em si JÁ foram aplicadas; o problema é só a geração de tipos.
- **Impacto ampliado**: esta é a causa raiz comum de TD-0008, TD-0011 e TD-0015 — todos "cast `as any` até rodar gen types". Nenhum deles fecha enquanto isso não for destravado, o que explica por que ficam abertos há meses.
- **Próximo passo**: destravar o acesso, por uma das vias — (a) obter um `SUPABASE_ACCESS_TOKEN` com privilégio no projeto, se o Lovable permitir emitir; (b) resolver o TD-0016 e gerar contra a stack local; (c) migrar para um Supabase próprio (alternativa já considerada e adiada no ADR-0016). Com qualquer uma delas: `supabase gen types typescript > src/integrations/supabase/types.ts` e trocar os acessores `folders()`/`filesTable()` pelo `supabase.from(...)` tipado, removendo os `eslint-disable`.

### TD-0014 — `project.members` (modelo antigo) ainda é lido como se fosse a equipe do projeto
- **Status**: aberto
- **Prioridade**: alta
- **Arquivos**: `src/components/projects/ProjectDetailDialog.tsx`, `src/components/projects/ProjectMembersTable.tsx`, `src/components/projects/detail/ProjectCostsTab.tsx`, `src/components/projects/detail/ProjectCostBreakdownChart.tsx`, `src/components/projects/detail/ProjectOverviewTab.tsx` (cálculo financeiro), `src/components/timesheets/TimesheetByProject.tsx`, `src/components/timesheets/AdminWeekEditDialog.tsx`, `src/components/timesheets/weekly/WeeklyTimesheetGrid.tsx`
- **Impacto**: o ADR-0006 tornou `project_role_allocations` a fonte única de alocação, mas `project.members` (tabela `project_members`) continua sendo lido como "a equipe do projeto" em várias telas. Como o backfill correu uma vez e só na direção legado→novo, todo projeto montado pela aba Equipe tem `project_members` vazio. Consequência observada em produção no projeto "Cobrança Automática": a Visão Geral mostrava "0 membro(s) alocado(s)" convivendo com R$ 8.876,48 de custo realizado, e o checklist de início travava em "Pelo menos 1 membro com horas alocadas · 0 pessoas" com o projeto já em execução e gente alocada. Três consumidores foram corrigidos nesta sessão (card da Visão Geral removido, contagem do checklist e destinatários da notificação de início de execução); os listados acima seguem no modelo antigo. Os de timesheet são os mais delicados: `project_timesheets` ainda referencia `project_member_id`, então não é troca de fonte, é a Fase 4 do ADR-0006.
- **Causa raiz**: a Fase 3 do ADR-0006 (cutover de leitura) foi executada só parcialmente. Não há guarda impedindo novo código de ler `project.members` como equipe, e o tipo `ProjectWithRelations` continua expondo o campo sem marcação de legado.
- **Próximo passo**: separar os consumidores em dois grupos e tratar diferente — (a) os que querem "quem está alocado" devem migrar para `useProjectAllocations`/`useTeamAllocationRows` agora; (b) os de timesheet dependem da migração de `project_timesheets` (Fase 4) e não devem ser tocados antes dela. Marcar `ProjectWithRelations.members` como deprecated com comentário apontando para o ADR-0006 ajuda a estancar novos usos enquanto a Fase 4 não vem.
- **Atualização 2026-08-11**: o defeito também estava em **RLS**, não só em tela. `can_view_project_document` (20260619150000) resolvia "membro do projeto" por `project_members`, então a equipe alocada não enxergava arquivo nenhum do projeto — e `ProjectDetail.tsx` calculava `isMember` da mesma forma, escondendo a própria aba Arquivos. Ambos corrigidos (migration `20260811160000`, que introduz `is_project_team_member` com fallback legado). Vale varrer o resto das policies atrás de outras que resolvem participação por `project_members`.

### TD-0013 — Total da aba Equipe soma desalocados ocultos sem sinalizar
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/components/projects/team/TeamAllocationTable.tsx` (`footerTotals`, botão "Mostrar desalocados")
- **Impacto**: `footerTotals` soma `activeRows` **e** `deallocatedRows`, mas as linhas de desalocado só são renderizadas quando `showDeallocated` está ligado. Com o toggle desligado — que é o default — o rodapé "Total" não bate com a soma das linhas visíveis e nada na tela explica a diferença. Observado num projeto real: linhas visíveis somavam 84h/68h em jun/26 contra 92h/80h no Total (8h planejadas e 12h realizadas vindas de uma pessoa desalocada oculta), e 108h/95h contra 114h/101h em jul/26. Quem lê o Total conclui que a tela está com defeito, ou reporta o número errado para fora. O KPI de Alocação GPO (ADR-0018) herda a mesma base e, portanto, a mesma ambiguidade.
- **Causa raiz**: o toggle de visibilidade foi tratado como filtro de exibição de linhas, sem contrapartida no agregado do rodapé — nem excluindo do total, nem sinalizando a inclusão.
- **Próximo passo**: decidir e aplicar UMA das duas leituras, não as duas: (a) o Total inclui desalocados e passa a sinalizar isso quando eles estão ocultos (ex.: "inclui 1 desalocado" no rodapé, com o mesmo texto no popover do KPI); ou (b) o Total passa a seguir o toggle, e o KPI segue junto. É decisão de produto — a opção (a) preserva o número atual e não altera nenhum histórico de leitura. Descoberto durante o ADR-0018; deixado fora daquele diff por escolha explícita de escopo.

### TD-0011 — cast `as any` em service_line_avg_tickets (tabela/RPCs fora dos tipos gerados)
- **Status**: resolvido por remoção (2026-08-11) — o subsistema de ticket médio foi removido inteiro (frontend e banco) pela migration `20260811120000_drop_service_avg_tickets.sql`. Os arquivos que carregavam os casts deixaram de existir. Ver ADR-0017.
- **Prioridade**: baixa
- **Arquivos**: `src/hooks/useServiceLineAvgTicketsMap.ts`, `src/services/serviceLineAvgTicketService.ts` (removidos)
- **Impacto**: a migration `20260806130000_service_line_avg_tickets.sql` cria a tabela `service_line_avg_tickets` e as functions `get_service_line_avg_tickets()`/`recalculate_service_line_avg_tickets_now()`, mas o `src/integrations/supabase/types.ts` gerado ainda não as conhece (migration não aplicada no ambiente onde os tipos foram gerados pela última vez). Mesma situação de TD-0008/TD-0001/TD-0003 — sem risco funcional (erros de RLS/policy continuam sendo pegos em runtime pelo Postgres, só a tipagem estática do client fica cega).
- **Causa raiz**: migration nova ainda não aplicada no ambiente onde os tipos foram gerados pela última vez.
- **Próximo passo**: depois de aplicar a migration, rodar `supabase gen types typescript --local > src/integrations/supabase/types.ts` e remover os casts `as any`/`supabase.rpc as any` desses dois arquivos.

### TD-0010 — Semana sem nenhum projeto nunca é detectada como "enviada"
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/components/timesheets/weekly/WeeklyTimesheetGrid.tsx` (`allProjectsLocked`)
- **Impacto**: `allProjectsLocked` retorna sempre `false` quando `projects.length === 0`. Um colaborador que só lança horas em atividades internas (sem nenhum projeto alocado naquela semana) nunca vê "Semana enviada" no rodapé, o botão "Enviar semana" nunca desabilita (pode reenviar indefinidamente), e mesmo depois do fix de 2026-07-29 — que passou a usar `allProjectsLocked` como override para travar QUALQUER linha da semana enviada, inclusive atividades nunca tocadas — as células de atividade continuam editáveis indefinidamente para esse perfil, porque o sinal de "semana travada" nunca liga.
- **Causa raiz**: o único sinal de "semana enviada" hoje é agregado a partir de `project_timesheets`/`project_timesheet_submissions`, por projeto. Não existe uma submissão de semana (ou de atividades internas) independente de projeto.
- **Próximo passo**: modelar um sinal explícito de "semana enviada" que não dependa de existir pelo menos um projeto — ex.: submissão por atividade análoga a `project_timesheet_submissions`, ou uma submissão de semana agregada por colaborador. É decisão de produto, não só de código — candidato a ADR se afetar mais de uma tela.

### TD-0012 — Gate de orçamento do pipeline existe só no frontend
- **Status**: aberto
- **Prioridade**: média
- **Arquivos**: `src/services/leadService.ts` (`updateLeadStage`), `src/components/crm/LeadDetailDialog.tsx` (`canAdvanceFrom`), `src/components/crm/LeadKanbanBoard.tsx` (drag & drop)
- **Impacto**: a exigência de `budget_id` para avançar de Proposta Enviada para Negociação é validada apenas no cliente. `updateLeadStage` grava `crm_stage` sem checar nada, e não há CHECK constraint, trigger nem policy RLS no banco impedindo uma oportunidade chegar a `negotiation` ou `closed` sem orçamento. Qualquer chamada direta ao PostgREST com um token válido do tenant contorna a regra. Também há duplicação: a mesma regra vive em dois lugares no frontend, com mensagens diferentes, e pode divergir.
- **Causa raiz**: a regra nasceu como validação de UX (GP-J3) e nunca foi promovida a invariante de domínio no banco.
- **Próximo passo**: mover o gate para o banco — trigger `BEFORE UPDATE` em `leads` validando a transição, ou uma RPC `advance_lead_stage` que centralize as pré-condições e vire o único caminho de escrita de `crm_stage`. Descoberto durante o ADR-0017; fora do escopo daquele diff.

### TD-0001 — `as any` em Edge Functions de alertas de parcelas
- **Status:** aberto
- **Prioridade:** baixa
- **Arquivo:** `supabase/functions/notify-installment-alerts/index.ts`
- **Impacto:** Deno não tem inferência automática das respostas do Supabase JS SDK; os casts `as any` existem nos campos `installment_number`, `value`, `invoice_date` e `projects` dos registros retornados pela query. Sem risco funcional imediato — mas reduz segurança de tipos e pode mascarar erros de schema no futuro.
- **Próximo passo:** Criar interfaces tipadas para as rows de `project_installments` + `projects` no contexto Deno (ou extrair um tipo compartilhado via `supabase gen types`), removendo os casts.

## Resolvido

- Nenhum item registrado ainda.
