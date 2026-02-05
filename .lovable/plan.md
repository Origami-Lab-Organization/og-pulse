

# Plano: Adicionar Campo "Ação" ao Stakeholder

## Objetivo

Adicionar um novo campo dropdown chamado **"Ação"** no formulário de stakeholder com as seguintes opções:
- Manter satisfeito
- Manter informado
- Gerenciar de perto
- Envolver nos ritos

---

## Alterações Necessárias

### 1. Migração do Banco de Dados

Adicionar coluna `action` na tabela `project_stakeholders`:

```sql
ALTER TABLE project_stakeholders 
ADD COLUMN action TEXT NULL;
```

---

### 2. Atualizar Tipos (`src/types/projectStakeholder.ts`)

Adicionar o novo tipo e constantes:

```typescript
export type StakeholderAction = 'keep_satisfied' | 'keep_informed' | 'manage_closely' | 'involve_in_rituals';

// Adicionar à interface ProjectStakeholder
action: StakeholderAction | null;

// Adicionar às interfaces de input
action?: StakeholderAction;

// Adicionar constantes de labels e opções
export const STAKEHOLDER_ACTION_LABELS: Record<StakeholderAction, string> = {
  keep_satisfied: 'Manter satisfeito',
  keep_informed: 'Manter informado',
  manage_closely: 'Gerenciar de perto',
  involve_in_rituals: 'Envolver nos ritos',
};

export const STAKEHOLDER_ACTION_OPTIONS = [
  { value: 'keep_satisfied', label: 'Manter satisfeito' },
  { value: 'keep_informed', label: 'Manter informado' },
  { value: 'manage_closely', label: 'Gerenciar de perto' },
  { value: 'involve_in_rituals', label: 'Envolver nos ritos' },
];
```

---

### 3. Atualizar Hook (`src/hooks/useProjectStakeholders.ts`)

- Importar `StakeholderAction`
- No `useProjectStakeholders`, mapear `action` para o tipo correto
- No `useCreateStakeholder`, incluir `action` no insert
- No `useUpdateStakeholder`, incluir `action` no update

---

### 4. Atualizar Formulário (`src/components/projects/stakeholders/StakeholderFormDialog.tsx`)

#### Schema Zod
```typescript
action: z.enum(['keep_satisfied', 'keep_informed', 'manage_closely', 'involve_in_rituals']).optional(),
```

#### Default Values
```typescript
action: undefined,
```

#### Reset no useEffect
```typescript
action: stakeholder.action || undefined,
```

#### Novo Campo no Formulário
Adicionar um novo campo Select após o grid de Influência/Interesse:

```tsx
<FormField
  control={form.control}
  name="action"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Ação</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {STAKEHOLDER_ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### onSubmit
Incluir `action: data.action as StakeholderAction | undefined` nas chamadas de create e update.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar coluna `action` na tabela |
| `types/projectStakeholder.ts` | Adicionar tipo, interfaces e constantes |
| `hooks/useProjectStakeholders.ts` | Mapear e persistir o campo `action` |
| `StakeholderFormDialog.tsx` | Adicionar campo dropdown no formulário |

---

## Resultado Esperado

O usuário poderá selecionar uma ação para cada stakeholder durante o planejamento do projeto, facilitando a definição da estratégia de engajamento com base na matriz de influência/interesse.

