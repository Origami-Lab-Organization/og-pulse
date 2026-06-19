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

### TD-002 — `(employee as any)[field]` no acesso dinâmico a campos versionados
- **Status**: aberto
- **Prioridade**: baixa
- **Arquivos**: `src/pages/EmployeeDetail.tsx`, `src/components/employees/EmployeeFormDialog.tsx`
- **Impacto**: perda de type-safety na comparação de campos versionados; sem impacto em runtime pois os nomes dos campos batem com os da interface `Employee` gerada por `dbToEmployee`.
- **Causa raiz**: o array `versionedFields` usa nomes camelCase do `FormData` (ex: `salarioMensal`, `jornadaDiaria`) que não são reconhecidos pelo TypeScript como índices válidos de `Employee` sem cast explícito.
- **Próximo passo**: tipar `versionedFields` como `Array<keyof Employee & keyof FormData>` e usar uma função de comparação com assinatura tipada, eliminando o cast `as any`.

## Resolvido

- Nenhum item registrado ainda.
