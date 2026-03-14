

## Problema

O preview não carrega porque `LeadDetailDialog.tsx` importa 3 módulos que não existem:

1. `@/hooks/useServices` — hook não criado
2. `@/types/service` — tipo `PROJECT_TYPE_LABELS` não criado
3. `ProjectType` não é exportado de `@/types/project`
4. `fromStage` passado ao `updateStage.mutate` mas não existe no tipo da mutation

## Correção (4 alterações)

### 1. Criar `src/types/service.ts`
Definir `ProjectType` e `PROJECT_TYPE_LABELS`:
```typescript
export type ProjectType = 'fixed_scope' | 'continuous' | 'success_fee' | 'non_revenue';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  fixed_scope: 'Escopo Fechado',
  continuous: 'Contínuo',
  success_fee: 'Success Fee',
  non_revenue: 'Sem Receita',
};
```

### 2. Criar `src/hooks/useServices.ts`
Hook que busca da tabela `services` (já existe no banco):
```typescript
export function useServices() {
  // query supabase services table
  // retorna { id, name, projectType, ... }
}
```

### 3. Corrigir import em `LeadDetailDialog.tsx` (linha 34)
Trocar `import { ProjectType } from '@/types/project'` por `import { ProjectType } from '@/types/service'` (já que o tipo estará lá).

### 4. Corrigir `fromStage` em `LeadDetailDialog.tsx` (linha 224)
Remover `fromStage` do objeto passado ao `updateStage.mutate`, pois a mutation só aceita `{ id, stage }`.

