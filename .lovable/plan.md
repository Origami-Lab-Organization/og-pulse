
# Plano: Ajustes na Fase de Planejamento do Projeto

## Resumo das Alteracoes

1. **Checklist de OKRs dinamico**: O item "OKRs definidos" deve ser marcado quando existir ao menos 1 OKR com pelo menos 1 Key Result
2. **Stakeholders - Melhorias no formulario**:
   - Verificar que o papel "Patrocinador" (sponsor) ja existe no dropdown
   - Adicionar mascaras para telefone e e-mail
   - Adicionar novo campo "Nivel de Patrocinio" (Promotor, Neutro, Detrator)

---

## 1. Checklist Dinamico de OKRs

### Arquivo: `src/components/projects/detail/ProjectPlanningOverviewTab.tsx`

**Alteracao necessaria:**
- Importar o hook `useProjectOKRs`
- Calcular se o projeto possui OKRs validos (ao menos 1 objetivo com 1+ key result)
- Passar o resultado para o `ChecklistItem` de OKRs

```typescript
// Adicionar import
import { useProjectOKRs } from '@/hooks/useProjectOKRs';

// Dentro do componente
const { data: okrs = [] } = useProjectOKRs(project.id);

// Calcular se tem OKRs validos
const hasValidOKRs = okrs.some(okr => (okr.key_results?.length || 0) > 0);

// Usar no ChecklistItem
<ChecklistItem 
  label="OKRs definidos" 
  completed={hasValidOKRs}
  hint={!hasValidOKRs ? "Va para a aba OKRs" : undefined}
/>
```

---

## 2. Novo Campo: Nivel de Patrocinio (sponsorship_level)

### 2.1 Migracao SQL

Adicionar nova coluna `sponsorship_level` na tabela `project_stakeholders`:

```sql
ALTER TABLE public.project_stakeholders 
ADD COLUMN sponsorship_level TEXT;

-- Valores permitidos: 'promoter', 'neutral', 'detractor'
```

### 2.2 Arquivo: `src/types/projectStakeholder.ts`

Adicionar novo tipo e constantes:

```typescript
export type SponsorshipLevel = 'promoter' | 'neutral' | 'detractor';

export interface ProjectStakeholder {
  // ... campos existentes
  sponsorship_level: SponsorshipLevel | null; // NOVO
}

export const SPONSORSHIP_LEVEL_LABELS: Record<SponsorshipLevel, string> = {
  promoter: 'Promotor',
  neutral: 'Neutro',
  detractor: 'Detrator',
};

export const SPONSORSHIP_LEVEL_OPTIONS = [
  { value: 'promoter', label: 'Promotor' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'detractor', label: 'Detrator' },
];
```

Atualizar interfaces de input:

```typescript
export interface CreateStakeholderInput {
  // ... campos existentes
  sponsorshipLevel?: SponsorshipLevel;
}

export interface UpdateStakeholderInput {
  // ... campos existentes
  sponsorshipLevel?: SponsorshipLevel;
}
```

### 2.3 Arquivo: `src/hooks/useProjectStakeholders.ts`

Atualizar as queries e mutations para incluir `sponsorship_level`:

**Na query:**
```typescript
sponsorship_level: s.sponsorship_level as SponsorshipLevel | null,
```

**No create:**
```typescript
sponsorship_level: input.sponsorshipLevel || null,
```

**No update:**
```typescript
sponsorship_level: updates.sponsorshipLevel,
```

---

## 3. Mascaras de Telefone e E-mail no Formulario

### Arquivo: `src/components/projects/stakeholders/StakeholderFormDialog.tsx`

**Alteracoes:**

1. Importar a funcao `formatPhone` de `@/lib/masks`
2. Aplicar mascara ao campo de telefone usando `onChange` customizado
3. E-mail nao precisa de mascara visual, apenas validacao (ja existe)

```typescript
import { formatPhone } from '@/lib/masks';

// Campo de telefone com mascara
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Telefone</FormLabel>
      <FormControl>
        <Input 
          placeholder="(00) 00000-0000" 
          {...field}
          onChange={(e) => field.onChange(formatPhone(e.target.value))}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 4. Adicionar Campo Nivel de Patrocinio no Formulario

### Arquivo: `src/components/projects/stakeholders/StakeholderFormDialog.tsx`

**Alteracoes:**

1. Importar `SPONSORSHIP_LEVEL_OPTIONS` e `SponsorshipLevel`
2. Adicionar campo `sponsorshipLevel` no schema zod
3. Adicionar campo no formulario
4. Incluir no submit

**Schema atualizado:**
```typescript
const formSchema = z.object({
  // ... campos existentes
  sponsorshipLevel: z.enum(['promoter', 'neutral', 'detractor']).optional(),
});
```

**Novo campo no form:**
```typescript
<FormField
  control={form.control}
  name="sponsorshipLevel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Nivel de Patrocinio</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="promoter">Promotor</SelectItem>
          <SelectItem value="neutral">Neutro</SelectItem>
          <SelectItem value="detractor">Detrator</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 5. Exibir Nivel de Patrocinio no Card do Stakeholder

### Arquivo: `src/components/projects/detail/ProjectStakeholdersTab.tsx`

Adicionar exibicao do novo campo no card:

```typescript
import { SPONSORSHIP_LEVEL_LABELS } from '@/types/projectStakeholder';

// Funcao para cor do badge
const getSponsorshipColor = (level: string | null) => {
  switch (level) {
    case 'promoter':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'neutral':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    case 'detractor':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// No card, adicionar badge
{stakeholder.sponsorship_level && (
  <Badge variant="outline" className={getSponsorshipColor(stakeholder.sponsorship_level)}>
    {SPONSORSHIP_LEVEL_LABELS[stakeholder.sponsorship_level]}
  </Badge>
)}
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectPlanningOverviewTab.tsx` | Adicionar logica dinamica para checklist de OKRs |
| `src/types/projectStakeholder.ts` | Adicionar tipo e constantes para sponsorship_level |
| `src/hooks/useProjectStakeholders.ts` | Incluir sponsorship_level nas queries e mutations |
| `src/components/projects/stakeholders/StakeholderFormDialog.tsx` | Adicionar mascara de telefone e campo de nivel de patrocinio |
| `src/components/projects/detail/ProjectStakeholdersTab.tsx` | Exibir nivel de patrocinio no card |

## Migracao de Banco de Dados

```sql
ALTER TABLE public.project_stakeholders 
ADD COLUMN sponsorship_level TEXT;
```

---

## Observacoes

1. O papel **Patrocinador (sponsor)** ja existe no dropdown `STAKEHOLDER_ROLES`
2. A mascara de telefone usara a funcao `formatPhone` ja existente em `src/lib/masks.ts`
3. E-mail ja possui validacao via zod, nao necessita mascara visual
4. O nivel de patrocinio segue o conceito NPS: Promotor, Neutro, Detrator
