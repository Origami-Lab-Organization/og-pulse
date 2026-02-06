
# Plano: Acelerar Exibição de Fornecedor na Tabela

## Diagnóstico do Problema

Quando você adiciona um fornecedor:

1. O toast aparece imediatamente (após o banco confirmar a inserção)
2. A query `['project', projectId]` é invalidada
3. O React Query **refetch** todo o projeto do banco (incluindo members, installments, suppliers, materials)
4. Só quando essa query termina, a UI atualiza

Esse fluxo causa a demora de 1-3 segundos para o registro aparecer na tabela.

## Solução: Optimistic Update

Vamos atualizar o cache do React Query **imediatamente** ao adicionar o fornecedor, antes mesmo da resposta do banco. Se houver erro, revertemos.

Esse padrão já é usado em `useRemoveProjectMember` (linhas 242-284) com sucesso.

## Implementação

### Hook `useAddProjectSupplier`

**Antes:**
```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['project-suppliers'] });
  queryClient.invalidateQueries({ queryKey: ['project'] });
  toast({ ... });
}
```

**Depois:**
```typescript
onMutate: async (input) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: ['project', input.projectId] });
  await queryClient.cancelQueries({ queryKey: ['project-suppliers', input.projectId] });
  
  // Snapshot previous data
  const previousProject = queryClient.getQueryData(['project', input.projectId]);
  const previousSuppliers = queryClient.getQueryData(['project-suppliers', input.projectId]);
  
  // Optimistically add supplier with temporary ID
  const tempSupplier = {
    id: `temp-${Date.now()}`,
    project_id: input.projectId,
    name: input.name,
    description: input.description || null,
    monthly_value: input.monthlyValue,
    supplier_id: input.supplierId || null,
    budget_supplier_id: input.budgetSupplierId || null,
    start_month: input.startMonth,
    end_month: input.endMonth || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Update project cache
  queryClient.setQueryData(['project', input.projectId], (old) => {
    if (!old) return old;
    return {
      ...old,
      suppliers: [...(old.suppliers || []), tempSupplier],
    };
  });
  
  // Update suppliers cache
  queryClient.setQueryData(['project-suppliers', input.projectId], (old) => {
    if (!old) return [];
    return [...old, tempSupplier];
  });
  
  return { previousProject, previousSuppliers, projectId: input.projectId };
},
onSuccess: (newSupplier, input, context) => {
  // Replace temp supplier with real one in cache
  queryClient.setQueryData(['project', input.projectId], (old) => {
    if (!old) return old;
    return {
      ...old,
      suppliers: old.suppliers?.map((s) => 
        s.id.startsWith('temp-') ? newSupplier : s
      ) || [newSupplier],
    };
  });
  
  queryClient.setQueryData(['project-suppliers', input.projectId], (old) => {
    if (!Array.isArray(old)) return [newSupplier];
    return old.map((s) => s.id.startsWith('temp-') ? newSupplier : s);
  });
  
  toast({ ... });
},
onError: (error, input, context) => {
  // Rollback on error
  if (context?.previousProject) {
    queryClient.setQueryData(['project', context.projectId], context.previousProject);
  }
  if (context?.previousSuppliers) {
    queryClient.setQueryData(['project-suppliers', context.projectId], context.previousSuppliers);
  }
  toast({ variant: 'destructive', ... });
}
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useProjectCosts.ts` | Adicionar optimistic update em `useAddProjectSupplier` |

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Toast → Espera 1-3s → Registro aparece | Toast + Registro aparecem ao mesmo tempo |

## Benefícios

1. **UX instantânea**: Registro aparece imediatamente
2. **Rollback automático**: Se der erro, volta ao estado anterior
3. **Consistência**: Toast e registro sincronizados
4. **Padrão já existente**: Segue o mesmo padrão de `useRemoveProjectMember`
