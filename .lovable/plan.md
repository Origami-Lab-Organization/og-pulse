

## Diagnóstico — 15 erros de build em 7 arquivos

O problema central é que `ProjectType` nunca foi exportado de `@/types/project.ts`, e vários arquivos importam dele. Além disso, há propriedades inexistentes e funções não exportadas.

### Grupo 1: `ProjectType` não existe em `@/types/project` (afeta 6 arquivos)

**Correção:** Adicionar `export type ProjectType = 'fixed_scope' | 'continuous' | 'success_fee' | 'non_revenue';` em `src/types/project.ts`. Também exportar `PROJECT_TYPE_LABELS` e `PROJECT_TYPE_DESCRIPTIONS` de lá para satisfazer o import de `CloseBusinessDialog`.

Isso resolve automaticamente os erros em:
- `src/types/service.ts` (importa de `./project`)
- `src/components/crm/CloseBusinessDialog.tsx`
- `src/components/crm/LeadFormDialog.tsx`
- `src/components/services/ServiceFormDialog.tsx`
- `src/pages/Services.tsx`

### Grupo 2: `LeadDetailDialog.tsx` — `ProjectType` não exportado + snake_case em tipo camelCase

- Linha 33: `ProjectType` importado de `@/types/service` mas não é re-exportado — corrigir para exportar de `service.ts` (já importa de `project`, basta re-exportar)
- Linha 100: `s.project_type` → `s.projectType` (tipo `Service` usa camelCase)
- Linha 394: `s.unit_price` → `s.unitPrice`

### Grupo 3: `LeadKanbanBoard.tsx` — `projectType` não existe em `CloseBusinessInput`

- Linha 72: Adicionar `projectType` ao interface `CloseBusinessInput` em `useCloseBusinessDeal.ts`, ou remover do objeto passado ao mutate. Como o CloseBusinessDialog já envia esse campo, o correto é adicionar ao interface.

### Grupo 4: `BudgetVersionCompare.tsx` — funções e tipos inexistentes

- `compareSnapshots` e `VersionDiff` não existem em `budgetVersionService.ts`
- `change_reason` não existe em `BudgetVersionWithCreator`

**Correção:** Criar a função `compareSnapshots`, o tipo `VersionDiff` no service, e adicionar `change_reason` ao tipo `BudgetVersionWithCreator`.

---

### Arquivos a alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/project.ts` | Exportar `ProjectType`, `PROJECT_TYPE_LABELS`, `PROJECT_TYPE_DESCRIPTIONS` |
| `src/types/service.ts` | Re-exportar `ProjectType` (`export { ProjectType }`) |
| `src/components/crm/LeadDetailDialog.tsx` | Corrigir `project_type` → `projectType`, `unit_price` → `unitPrice` |
| `src/hooks/useCloseBusinessDeal.ts` | Adicionar `projectType?`, `renewalDate?`, `successFeePercent?`, `monthlyValue?` ao `CloseBusinessInput` |
| `src/services/budgetVersionService.ts` | Criar `compareSnapshots()`, `VersionDiff`, adicionar `change_reason` ao tipo |

