# Log de Divida Tecnica

## Aberto

- Preencher discovery completo do Harness com time, cliente, compliance e restricoes reais.
- Revisar migrations Supabase antigas para identificar decisoes arquiteturais que merecem ADR.
- Confirmar padrao oficial de lock/aprovacao de timesheets e documentar em pattern dedicado se necessario.

### TD-001 — cast `as any` em benefitService e toolService
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/services/benefitService.ts`, `src/services/toolService.ts`
- **Impacto**: perda de type-safety nas chamadas ao Supabase client nestes dois services enquanto a dívida existir; sem impacto em runtime pois os retornos são recastados para os tipos corretos (`as unknown as BenefitDB[]`).
- **Causa raiz**: tabelas `benefits` e `tools` criadas via migration ainda não foram aplicadas no ambiente, portanto o `types.ts` gerado automaticamente não as conhece. O Supabase client rejeita `.from('benefits')` e `.from('tools')` no nível de tipo.
- **Próximo passo**: após o PM rodar as migrations no Supabase, executar `supabase gen types typescript --local > src/integrations/supabase/types.ts`, remover o `as any` e o comentário `eslint-disable` de ambos os services. Remover também os casts `as unknown as BenefitDB[]` / `as unknown as ToolDB[]` desnecessários.

### TD-002 — cast `as any` em vacationService (tabelas de férias)
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/services/vacationService.ts`, `src/components/inbox/InboxVacationDetail.tsx`
- **Impacto**: perda de type-safety nas chamadas ao Supabase client para `vacation_requests`, `vacation_request_approvals`, `notifications` e `user_roles` enquanto a dívida existir; sem impacto em runtime (retornos recastados para `VacationRequestDB` / `VacationApprovalDB`). A lógica crítica de negócio (saldo e aprovação) está extraída e testada em `src/lib/vacationBalanceCalculator.ts` e `src/lib/vacationApproval.ts`, fora do service.
- **Causa raiz**: tabelas `vacation_requests` e `vacation_request_approvals` criadas em `supabase/migrations/20260619120000_vacation_management.sql` ainda não aplicadas no ambiente, então o `types.ts` gerado não as conhece (mesma situação do TD-001, ver ADR-0003).
- **Próximo passo**: após aplicar a migration no Supabase, rodar `supabase gen types typescript --local > src/integrations/supabase/types.ts`, remover os `as any` e o `eslint-disable` do `vacationService.ts`.

## Resolvido

- Nenhum item registrado ainda.
