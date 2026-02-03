
# Plano: Corrigir Formularios Pre-preenchidos e Checklist de Stakeholders

## Problemas Identificados

1. **Formularios vindo pre-preenchidos**: Quando o usuario cria um OKR, KR, Stakeholder ou Milestone, e depois tenta criar um novo, o formulario vem com os dados do anterior
2. **Checklist de Stakeholders**: Esta sempre como "nao concluido" (hardcoded `completed={false}`)

## Causa Raiz do Problema 1

O `useEffect` que reseta o formulario depende apenas de `entity` (ex: `stakeholder`, `keyResult`, etc.) e `form`. Quando o dialogo abre para um **novo** item:
- Primeira vez: `entity = null` -> form reseta corretamente
- Segunda vez: `entity = null` (mesmo valor) -> `useEffect` nao re-executa, formulario mantem valores antigos

## Solucao

### 1. Adicionar `open` como dependencia do useEffect

Em todos os formularios de dialogo, adicionar `open` como dependencia do `useEffect` para que o form seja resetado sempre que o dialogo abrir.

**Arquivos afetados:**
- `src/components/projects/okrs/OKRFormDialog.tsx`
- `src/components/projects/okrs/KeyResultFormDialog.tsx`
- `src/components/projects/stakeholders/StakeholderFormDialog.tsx`
- `src/components/projects/schedule/MilestoneFormDialog.tsx`

**Alteracao em cada arquivo:**

```typescript
// Antes
useEffect(() => {
  if (entity) {
    form.reset({...});
  } else {
    form.reset({...defaultValues});
  }
}, [entity, form]);

// Depois
useEffect(() => {
  if (open) {
    if (entity) {
      form.reset({...});
    } else {
      form.reset({...defaultValues});
    }
  }
}, [open, entity, form]);
```

### 2. Adicionar Checklist Dinamico de Stakeholders

**Arquivo:** `src/components/projects/detail/ProjectPlanningOverviewTab.tsx`

Importar o hook `useProjectStakeholders` e verificar se existe ao menos um stakeholder:

```typescript
import { useProjectStakeholders } from '@/hooks/useProjectStakeholders';

// Dentro do componente
const { data: stakeholders = [] } = useProjectStakeholders(project.id);
const hasStakeholders = stakeholders.length > 0;

// No ChecklistItem
<ChecklistItem 
  label="Stakeholders mapeados" 
  completed={hasStakeholders}
  hint={!hasStakeholders ? "Va para a aba Stakeholders" : undefined}
/>
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `OKRFormDialog.tsx` | Adicionar `open` como dependencia do `useEffect` |
| `KeyResultFormDialog.tsx` | Adicionar `open` como dependencia do `useEffect` |
| `StakeholderFormDialog.tsx` | Adicionar `open` como dependencia do `useEffect` |
| `MilestoneFormDialog.tsx` | Adicionar `open` como dependencia do `useEffect` |
| `ProjectPlanningOverviewTab.tsx` | Adicionar verificacao dinamica de stakeholders no checklist |

---

## Logica Final dos Formularios

```text
┌─────────────────────────────────────────────────────────────┐
│ useEffect([open, entity, form])                             │
├─────────────────────────────────────────────────────────────┤
│ if (open) {                                                 │
│   if (entity) {                                             │
│     // Modo edicao: preencher com dados existentes          │
│     form.reset(entityData);                                 │
│   } else {                                                  │
│     // Modo criacao: limpar formulario                      │
│     form.reset(defaultValues);                              │
│   }                                                         │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Logica Final do Checklist

```text
Checklist de Preparacao:
[x] Informacoes basicas    -> client_id && manager_id existem
[x] OKRs definidos         -> ao menos 1 OKR com 1+ Key Result
[x] Stakeholders mapeados  -> ao menos 1 stakeholder (NOVO)
[x] Equipe alocada         -> members.length > 0
[ ] Custos planejados      -> TODO: implementar
[ ] Cronograma definido    -> TODO: implementar
```
