

# Plano: Edição de Horas por Linha com Botões de Ação

## Alterações Solicitadas

Com base na imagem de referência, os seguintes ajustes serão implementados:

1. **Remover o botão "Editar Horas" do rodapé do Card**
2. **O botão de editar na coluna Ações libera a edição de horas apenas daquele funcionário**
3. **Ao clicar no ícone de editar, as ações mudam para ✓ (salvar) e ✗ (cancelar)**

## Nova Interação Visual

```
Estado Normal:
┌─────────────────┬───────┬──────┬──────┬──────┬──────────┐
│ Funcionário     │ R$/h  │ Mês 1│ Mês 2│ Horas│ Ações    │
├─────────────────┼───────┼──────┼──────┼──────┼──────────┤
│ Victor Couto    │R$119  │  84  │  84  │ 420h │ [✏] [🗑] │
│ Gerente Sênior  │       │      │      │      │          │
└─────────────────┴───────┴──────┴──────┴──────┴──────────┘

Estado Editando (após clicar em ✏):
┌─────────────────┬───────┬──────┬──────┬──────┬──────────┐
│ Funcionário     │ R$/h  │ Mês 1│ Mês 2│ Horas│ Ações    │
├─────────────────┼───────┼──────┼──────┼──────┼──────────┤
│ Victor Couto    │R$119  │[    ]│[    ]│ 420h │ [✓] [✗]  │
│ Gerente Sênior  │       │inputs│inputs│      │          │
└─────────────────┴───────┴──────┴──────┴──────┴──────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Alterar o estado de controle de edição (linhas 95-96)

Mudar de boolean global para ID do membro em edição:

**Antes:**
```tsx
// Hours edit mode toggle
const [hoursEditMode, setHoursEditMode] = useState(false);
```

**Depois:**
```tsx
// Hours edit mode per member - stores the member ID being edited (null = none)
const [editingHoursMemberId, setEditingHoursMemberId] = useState<string | null>(null);
```

#### 2. Adicionar import do ícone X (linha 3)

**Antes:**
```tsx
import { Plus, Trash2, Users, Pencil, Check, TrendingDown, TrendingUp, Minus } from 'lucide-react';
```

**Depois:**
```tsx
import { Plus, Trash2, Users, Pencil, Check, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';
```

#### 3. Criar handler para cancelar edição e handler para salvar

Adicionar novo handler para cancelar (restaura valores originais):

```tsx
// Cancel hours edit for a member
const handleCancelHoursEdit = useCallback((memberId: string) => {
  // Clear any pending updates for this member
  Object.keys(pendingUpdates.current).forEach((key) => {
    if (key.startsWith(memberId)) {
      clearTimeout(pendingUpdates.current[key]);
      delete pendingUpdates.current[key];
    }
  });
  
  // Restore original values from memberMonths for this member
  const restoredHours: Record<string, number> = {};
  memberMonths.forEach((mm) => {
    if (mm.project_member_id === memberId) {
      const key = `${mm.project_member_id}-${mm.month_number}`;
      restoredHours[key] = mm.hours;
    }
  });
  setLocalHours((prev) => ({ ...prev, ...restoredHours }));
  setEditingHoursMemberId(null);
}, [memberMonths]);

// Save hours for a specific member and exit edit mode
const handleSaveHoursForMember = useCallback((memberId: string) => {
  // Clear pending timeouts for this member and trigger immediate saves
  Object.keys(pendingUpdates.current).forEach((key) => {
    if (key.startsWith(memberId)) {
      clearTimeout(pendingUpdates.current[key]);
      delete pendingUpdates.current[key];
    }
  });
  setEditingHoursMemberId(null);
}, []);
```

#### 4. Atualizar a condição de exibição dos inputs de horas (linhas 610-666)

Substituir `hoursEditMode` pela verificação do membro específico:

**Antes:**
```tsx
hoursEditMode ? (
  <Input ... />
) : (
  <span ... />
)
```

**Depois:**
```tsx
editingHoursMemberId === member.id ? (
  <Input ... />
) : (
  <span ... />
)
```

#### 5. Atualizar a coluna de Ações para alternar entre editar/excluir e salvar/cancelar (linhas 717-737)

**Antes:**
```tsx
{/* Actions column */}
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

**Depois:**
```tsx
{/* Actions column */}
{isEditable && (
  <TableCell className="text-center">
    <div className="flex items-center justify-center gap-1">
      {editingHoursMemberId === member.id ? (
        // Save/Cancel mode
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSaveHoursForMember(member.id)}
            title="Salvar"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCancelHoursEdit(member.id)}
            title="Cancelar"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </>
      ) : (
        // Edit/Delete mode
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingHoursMemberId(member.id)}
            title="Editar Horas"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveMember(member.id)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  </TableCell>
)}
```

#### 6. Remover o CardFooter com botão "Editar Horas" (linhas 856-871)

Remover completamente o bloco:
```tsx
{/* Footer with edit/save buttons */}
{isEditable && members.length > 0 && (
  <CardFooter className="justify-end border-t pt-4">
    {hoursEditMode ? (
      <Button onClick={handleSaveHours}>
        <Check className="mr-2 h-4 w-4" />
        Salvar Horas
      </Button>
    ) : (
      <Button variant="outline" onClick={() => setHoursEditMode(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar Horas
      </Button>
    )}
  </CardFooter>
)}
```

#### 7. Remover o handler handleSaveHours (linhas 193-202)

Este handler global não será mais necessário.

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Estado de edição | De `boolean` global para `string \| null` (ID do membro) |
| Import X | Adicionar ícone X de lucide-react |
| Novos handlers | `handleCancelHoursEdit` e `handleSaveHoursForMember` |
| Condição de input | `hoursEditMode` → `editingHoursMemberId === member.id` |
| Coluna Ações | Alternar entre [✏][🗑] e [✓][✗] |
| CardFooter | Removido completamente |

---

## Resultado Esperado

1. **Sem botão no rodapé**: Interface mais limpa
2. **Edição por linha**: Cada funcionário é editado individualmente
3. **Feedback visual**: Botões mudam para confirmar/cancelar durante edição
4. **Cancelar restaura valores**: Se cancelar, os valores originais são restaurados

