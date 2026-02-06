

# Plano: Campos Obrigatorios e Texto "Selecionar" para Acao

## Alteracoes

### 1. Formulario - Tornar Campos Obrigatorios

**Arquivo:** `src/components/projects/stakeholders/StakeholderFormDialog.tsx`

Atualizar o schema Zod para tornar obrigatorios: nome, cargo, papel, email e telefone:

```tsx
const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  jobTitle: z.string().min(1, 'Cargo é obrigatório'),  // ANTES: optional()
  role: z.string().min(1, 'Papel é obrigatório'),
  organization: z.string().optional(),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),  // ANTES: optional()
  phone: z.string().min(1, 'Telefone é obrigatório'),  // ANTES: optional()
  influenceLevel: z.enum(['high', 'medium', 'low']).optional(),
  interestLevel: z.enum(['high', 'medium', 'low']).optional(),
  sponsorshipLevel: z.enum(['promoter', 'neutral', 'detractor']).optional(),
  action: z.enum(['keep_satisfied', 'keep_informed', 'manage_closely', 'involve_in_rituals']).optional(),
  notes: z.string().optional(),
});
```

Adicionar asterisco (*) nos labels dos campos obrigatorios:

| Campo | Label Atual | Label Novo |
|-------|-------------|------------|
| Cargo | `Cargo` | `Cargo *` |
| E-mail | `E-mail` | `E-mail *` |
| Telefone | `Telefone` | `Telefone *` |

### 2. Card - Mostrar "Selecionar" quando Acao nao preenchida

**Arquivo:** `src/components/projects/detail/ProjectStakeholdersTab.tsx`

Alterar a exibicao da acao para sempre mostrar algo:

```tsx
// ANTES
{stakeholder.action && (
  <p>Ação: {STAKEHOLDER_ACTION_LABELS[stakeholder.action as StakeholderAction]}</p>
)}

// DEPOIS
<p>
  Ação:{' '}
  {stakeholder.action
    ? STAKEHOLDER_ACTION_LABELS[stakeholder.action as StakeholderAction]
    : 'Selecionar'}
</p>
```

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `StakeholderFormDialog.tsx` | Schema Zod: `jobTitle`, `email`, `phone` obrigatorios |
| `StakeholderFormDialog.tsx` | Labels com `*` para campos obrigatorios |
| `ProjectStakeholdersTab.tsx` | Exibir "Selecionar" quando `action` for null |

