
# Plano: Permitir Lançamento de Custos Reais em Projetos em Execução

## Problema Atual

A aba de Custos bloqueia **toda edição** quando o projeto sai da fase de "Planejamento". Isso impede o lançamento de custos reais (fornecedores e materiais) durante a execução do projeto.

## Conceito de Edição Separada

Na fase de **Execução**, devemos:
- **Bloquear** edição do planejado (valores já definidos)
- **Permitir** lançamento do realizado

---

## Alterações Necessárias

### 1. Arquivo: `src/pages/ProjectDetail.tsx`

Passar informação adicional para a aba de custos indicando se está em execução:

```typescript
// Linha 86 - Adicionar flag de execução
const isPlanning = project.portfolio_stage === 'planning';
const isExecution = project.portfolio_stage !== 'planning';
```

### 2. Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`

Atualizar props e lógica:

```typescript
interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;       // Pode editar planejado
  canEditActuals?: boolean;  // Pode lançar realizados (NOVO)
}

// Passar para as seções
<ProjectSuppliersSection
  ...
  isEditable={isEditable}
  canEditActuals={canEditActuals || isEditable}  // NOVO
/>

<ProjectMaterialsSection
  ...
  isEditable={isEditable}
  canEditActuals={canEditActuals || isEditable}  // NOVO
/>
```

### 3. Arquivo: `src/components/projects/detail/ProjectSuppliersSection.tsx`

Separar lógica de edição:

```typescript
interface ProjectSuppliersSectionProps {
  ...
  isEditable: boolean;       // Editar planejado
  canEditActuals?: boolean;  // Lançar realizado
}

// Na renderização das células mensais:
{/* Valor Planejado - só mostra input se isEditable */}
{isEditable ? (
  <Input ... />  // Input editável
) : (
  <span>{formatCurrency(plannedValue)}</span>  // Somente leitura
)}

{/* Valor Realizado - mostra input se canEditActuals */}
{canEditActuals ? (
  <Input ... onChange={handleActualValueChange} />  // Input editável
) : (
  <span>{formatCurrency(actualValue)}</span>  // Somente leitura
)}
```

### 4. Arquivo: `src/components/projects/detail/ProjectMaterialsSection.tsx`

Permitir toggle de "Realizado" mesmo fora do planejamento:

```typescript
interface ProjectMaterialsSectionProps {
  ...
  isEditable: boolean;       // Adicionar novos materiais
  canEditActuals?: boolean;  // Marcar como realizado
}

// O botão de toggle "Realizado" deve aparecer quando canEditActuals=true
{(isEditable || canEditActuals) && (
  <Button onClick={() => handleToggleRealized(...)}>
    {material.is_realized ? 'Sim' : 'Não'}
  </Button>
)}
```

---

## Layout Final (Projeto em Execução)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FORNECEDORES                                                            │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Nome            │  Mês 1         │  Mês 2         │  Total            │
│                 │  Plan | Real   │  Plan | Real   │  Plan | Real      │
├─────────────────┼────────────────┼────────────────┼───────────────────┤
│ AWS Hosting     │ R$1.500        │ R$1.500        │ R$3.000           │
│                 │ [___R$1.450__] │ [___R$_______] │ R$1.450           │
│                 │    ↑ editável  │   ↑ editável   │                   │
└─────────────────┴────────────────┴────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MATERIAIS                                                               │
├──────────────────────┬────────┬──────────────┬──────────────────────────┤
│ Descrição            │  Mês   │    Valor     │ Realizado               │
├──────────────────────┼────────┼──────────────┼──────────────────────────┤
│ Licença software X   │ Mês 2  │ R$ 2.500,00  │ [Toggle: Sim/Não] ← ativo│
└──────────────────────┴────────┴──────────────┴──────────────────────────┘
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectDetail.tsx` | Passar `canEditActuals={!isPlanning}` para CostsTab |
| `ProjectCostsTab.tsx` | Receber e repassar prop `canEditActuals` |
| `ProjectSuppliersSection.tsx` | Separar edição de planejado vs realizado |
| `ProjectMaterialsSection.tsx` | Permitir toggle de realizado em execução |

---

## Comportamento por Fase

| Fase | Editar Planejado | Lançar Realizado | Adicionar Itens |
|------|------------------|------------------|-----------------|
| Planejamento | ✅ | ✅ | ✅ |
| Execução | ❌ | ✅ | ❌ |
| Concluído | ❌ | ❌ | ❌ |
