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

## Resolvido

- Nenhum item registrado ainda.
