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

### TD-0001 — `as any` em Edge Functions de alertas de parcelas
- **Status:** aberto
- **Prioridade:** baixa
- **Arquivo:** `supabase/functions/notify-installment-alerts/index.ts`
- **Impacto:** Deno não tem inferência automática das respostas do Supabase JS SDK; os casts `as any` existem nos campos `installment_number`, `value`, `invoice_date` e `projects` dos registros retornados pela query. Sem risco funcional imediato — mas reduz segurança de tipos e pode mascarar erros de schema no futuro.
- **Próximo passo:** Criar interfaces tipadas para as rows de `project_installments` + `projects` no contexto Deno (ou extrair um tipo compartilhado via `supabase gen types`), removendo os casts.

## Resolvido

- Nenhum item registrado ainda.
