
# Plano: Melhorias na Alocação de Equipe

## Problemas Identificados

### 1. Exclusão Lenta
- A exclusão atual aguarda a resposta do servidor antes de atualizar a UI
- Solução: Implementar **Optimistic Update** - remover imediatamente da UI e reverter se der erro

### 2. Cabeçalho de Ações Ausente
- A coluna de ações não tem título
- Solução: Adicionar "Ações" como cabeçalho da coluna

### 3. Input de Horas Travando
- Problema: O debounce atual funciona, mas há um conflito com o `useEffect` que sincroniza `localHours` quando `memberMonths` muda. Ao salvar, o `memberMonths` é atualizado e o `useEffect` sobrescreve o estado local, causando comportamento estranho.
- Solução: Controlar quando o `useEffect` deve sincronizar (apenas se não houver edição pendente)

### 4. Modo Edição com Botão Salvar
- Novo fluxo: Durante o planejamento, iniciar em "modo visualização"
- Botão "Editar" libera os campos de hora para edição
- Botão "Salvar" fixa os valores e volta ao modo visualização

---

## Alterações Técnicas

### 1. Optimistic Update na Exclusão

No hook `useRemoveProjectMember` (useProjects.ts):

```typescript
export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await projectService.removeMember(id);
      return { projectId };
    },
    // NOVO: Optimistic update
    onMutate: async ({ id, projectId }) => {
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      
      const previousData = queryClient.getQueryData(['project', projectId]);
      
      // Atualizar UI imediatamente removendo o membro
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members?.filter((m: any) => m.id !== id) || [],
        };
      });

      return { previousData, projectId };
    },
    onError: (error, _, context) => {
      // Reverter em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(['project', context.projectId], context.previousData);
      }
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', data?.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data?.projectId] });
    },
  });
};
```

### 2. Adicionar Cabeçalho "Ações" e Botão de Edição

Em `ProjectLaborSection.tsx`, linha 408:

```tsx
// ANTES
{isEditable && <TableHead className="w-12" />}

// DEPOIS
{isEditable && (
  <TableHead className="text-center min-w-[80px]">Ações</TableHead>
)}
```

Adicionar import do `Pencil` e botão de edição junto com o de exclusão (linhas 486-497):

```tsx
{isEditable && (
  <TableCell className="text-center">
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openEditDialog(member)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleRemoveMember(member.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  </TableCell>
)}
```

### 3. Corrigir Sincronização do Estado Local

O problema está no `useEffect` que roda sempre que `memberMonths` muda. Precisamos evitar sobrescrever edições pendentes:

```tsx
// Estado para controlar se está em modo de edição ativo
const [isEditingHours, setIsEditingHours] = useState(false);
const hasPendingEdits = useRef(false);

// Sync local state quando memberMonths mudar, MAS apenas se não houver edições pendentes
useEffect(() => {
  if (hasPendingEdits.current) return; // Não sobrescrever durante edição
  
  const initial: Record<string, number> = {};
  memberMonths.forEach((mm) => {
    const key = `${mm.project_member_id}-${mm.month_number}`;
    initial[key] = mm.hours;
  });
  setLocalHours(initial);
}, [memberMonths]);

// Atualizar handler
const handleHoursChange = useCallback(
  (memberId: string, monthNumber: number, hours: number) => {
    const key = `${memberId}-${monthNumber}`;
    hasPendingEdits.current = true;

    setLocalHours((prev) => ({ ...prev, [key]: hours }));

    if (pendingUpdates.current[key]) {
      clearTimeout(pendingUpdates.current[key]);
    }

    pendingUpdates.current[key] = setTimeout(() => {
      upsertMemberMonth.mutate({
        projectMemberId: memberId,
        monthNumber,
        hours: hours || 0,
      }, {
        onSettled: () => {
          delete pendingUpdates.current[key];
          // Verificar se ainda há edições pendentes
          if (Object.keys(pendingUpdates.current).length === 0) {
            hasPendingEdits.current = false;
          }
        }
      });
    }, 500);
  },
  [upsertMemberMonth]
);
```

### 4. Modo Edição/Visualização com Botão Salvar

Adicionar estado de modo de edição:

```tsx
const [hoursEditMode, setHoursEditMode] = useState(false);

// Função para salvar e sair do modo de edição
const handleSaveHours = () => {
  // Forçar salvamento de todas as edições pendentes
  Object.values(pendingUpdates.current).forEach(clearTimeout);
  pendingUpdates.current = {};
  hasPendingEdits.current = false;
  setHoursEditMode(false);
};
```

No CardHeader, adicionar botão condicional:

```tsx
<CardHeader className="flex flex-row items-center justify-between">
  <div>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </div>
  <div className="flex gap-2">
    {isEditable && (
      hoursEditMode ? (
        <Button variant="default" onClick={handleSaveHours}>
          <Check className="mr-2 h-4 w-4" />
          Salvar Horas
        </Button>
      ) : members.length > 0 ? (
        <Button variant="outline" onClick={() => setHoursEditMode(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar Horas
        </Button>
      ) : null
    )}
    {isEditable && (
      <Button onClick={() => setDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Membro
      </Button>
    )}
  </div>
</CardHeader>
```

Modificar os inputs de horas para respeitar o modo:

```tsx
{hoursEditMode ? (
  <Input
    type="number"
    min="0"
    className="w-16 h-8 text-center mx-auto"
    value={plannedHours || ''}
    onChange={(e) => handleHoursChange(member.id, monthNum, Number(e.target.value))}
  />
) : (
  <span className="text-muted-foreground">{plannedHours > 0 ? plannedHours : '-'}</span>
)}
```

### 5. Dialog de Edição de Membro

Adicionar estado e dialog para editar papel, senioridade e valor/hora do membro:

```tsx
const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null);
const [editForm, setEditForm] = useState({ role: '', seniority: '', hourlyRate: 0 });
const updateMember = useUpdateProjectMember();

const openEditDialog = (member: typeof members[0]) => {
  setEditingMember(member);
  setEditForm({
    role: member.role,
    seniority: member.seniority,
    hourlyRate: (member as any).hourly_rate || 0,
  });
};

const handleUpdateMember = () => {
  if (!editingMember) return;
  updateMember.mutate({
    id: editingMember.id,
    projectId,
    updates: {
      role: editForm.role,
      seniority: editForm.seniority,
      hourly_rate: editForm.hourlyRate,
    },
  }, {
    onSuccess: () => setEditingMember(null),
  });
};
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `useProjects.ts` | Optimistic update na exclusão de membro |
| `ProjectLaborSection.tsx` | Cabeçalho "Ações", botão editar membro, modo edição de horas com Salvar/Editar, fix sync do estado local |

---

## Resultado Esperado

- Exclusão instantânea (otimista) com rollback em caso de erro
- Coluna de ações com ícones de editar e excluir
- Inputs de horas fluidos, sem travamento ao digitar
- Fluxo Editar → Modificar → Salvar para controle do usuário
