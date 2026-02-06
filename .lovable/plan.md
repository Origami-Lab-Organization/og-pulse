

# Plano: Reorganizar Card de Stakeholder

## Objetivo

Reorganizar a exibição de informações no card de stakeholder e torná-lo clicável para edição.

## Layout Proposto

Baseado na imagem de referência, o novo layout terá:

```text
┌────────────────────────────────────────────────────┐
│  [HP]  Heitor Pires                        [...]   │
│        Diretor de TI                               │
│        Patrocinador                                │
│                                                    │
│  [Cliente]  [Promotor]                             │
│                                                    │
│  Influência: [Alta]   Interesse: [Alto]            │
│  Ação: Gerenciar de perto                          │
│                                                    │
│  ✉ heitor@certifica.com.br                         │
│  📞 (11) 99999-9999                                │
└────────────────────────────────────────────────────┘
```

## Alterações

**Arquivo:** `src/components/projects/detail/ProjectStakeholdersTab.tsx`

### 1. Card Clicável

Adicionar `onClick` no `Card` para abrir edição, e `cursor-pointer` para indicar interatividade:

```tsx
<Card 
  key={stakeholder.id} 
  className="relative group cursor-pointer hover:border-primary/50 transition-colors"
  onClick={() => handleEdit(stakeholder)}
>
```

### 2. Evitar Propagação no Dropdown

O dropdown de ações precisa parar a propagação do click para não abrir edição ao clicar no menu:

```tsx
<DropdownMenuTrigger asChild>
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
    onClick={(e) => e.stopPropagation()}
  >
    <MoreHorizontal className="h-4 w-4" />
  </Button>
</DropdownMenuTrigger>
```

### 3. Reestruturar Conteúdo do Card

**Header (Avatar + Nome + Cargo + Papel):**
```tsx
<div className="flex items-start justify-between mb-3">
  <div className="flex items-center gap-3">
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-primary font-medium">
        {/* Iniciais */}
      </span>
    </div>
    <div className="min-w-0">
      <p className="font-medium">{stakeholder.name}</p>
      {stakeholder.job_title && (
        <p className="text-sm text-muted-foreground">{stakeholder.job_title}</p>
      )}
      <p className="text-sm text-muted-foreground">{getRoleLabel(stakeholder.role)}</p>
    </div>
  </div>
  {/* Dropdown menu */}
</div>
```

**Badges (Organização + Patrocínio):**
```tsx
<div className="flex flex-wrap gap-2 mb-3">
  {stakeholder.organization && (
    <Badge variant="outline">{getOrgLabel(stakeholder.organization)}</Badge>
  )}
  {stakeholder.sponsorship_level && (
    <Badge variant="outline" className={getSponsorshipColor(stakeholder.sponsorship_level)}>
      {SPONSORSHIP_LEVEL_LABELS[stakeholder.sponsorship_level]}
    </Badge>
  )}
</div>
```

**Infos menores (Influência, Interesse, Ação):**
```tsx
<div className="space-y-1 text-xs text-muted-foreground mb-3">
  <div className="flex items-center gap-4">
    {stakeholder.influence_level && (
      <span>
        Influência:{' '}
        <Badge variant="outline" className={cn('text-xs', getInfluenceColor(stakeholder.influence_level))}>
          {INFLUENCE_LEVEL_LABELS[stakeholder.influence_level]}
        </Badge>
      </span>
    )}
    {stakeholder.interest_level && (
      <span>
        Interesse:{' '}
        <Badge variant="outline" className="text-xs">
          {INTEREST_LEVEL_LABELS[stakeholder.interest_level]}
        </Badge>
      </span>
    )}
  </div>
  {stakeholder.action && (
    <p>Ação: {STAKEHOLDER_ACTION_LABELS[stakeholder.action]}</p>
  )}
</div>
```

**Contato (Email + Telefone):**
```tsx
{(stakeholder.email || stakeholder.phone) && (
  <div className="pt-2 border-t space-y-1 text-sm text-muted-foreground">
    {stakeholder.email && (
      <div className="flex items-center gap-2">
        <Mail className="h-3.5 w-3.5" />
        <span className="truncate">{stakeholder.email}</span>
      </div>
    )}
    {stakeholder.phone && (
      <div className="flex items-center gap-2">
        <Phone className="h-3.5 w-3.5" />
        <span>{stakeholder.phone}</span>
      </div>
    )}
  </div>
)}
```

### 4. Importar Label de Ação

Adicionar import do `STAKEHOLDER_ACTION_LABELS`:

```tsx
import {
  ProjectStakeholder,
  STAKEHOLDER_ROLES,
  INFLUENCE_LEVEL_LABELS,
  INTEREST_LEVEL_LABELS,
  ORGANIZATION_OPTIONS,
  SPONSORSHIP_LEVEL_LABELS,
  STAKEHOLDER_ACTION_LABELS,  // <- adicionar
  SponsorshipLevel,
  StakeholderAction,  // <- adicionar
} from '@/types/projectStakeholder';
```

## Hierarquia Visual Final

| Elemento | Tamanho/Estilo | Posição |
|----------|---------------|---------|
| Nome | `font-medium` | Header |
| Cargo (job_title) | `text-sm text-muted-foreground` | Abaixo do nome |
| Papel no projeto | `text-sm text-muted-foreground` | Abaixo do cargo |
| Organização/Patrocínio | Badges outline | Linha de badges |
| Influência/Interesse | `text-xs` com badges pequenos | Seção menor |
| Ação | `text-xs text-muted-foreground` | Seção menor |
| Email/Telefone | `text-sm text-muted-foreground` | Footer com borda |

## Comportamento

- Clicar em qualquer área do card abre o dialog de edição
- Clicar no botão `...` abre o dropdown (sem propagar para o card)
- Hover no card mostra borda destacada e botão de menu

