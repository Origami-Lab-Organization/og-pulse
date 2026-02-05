

# Plano: Ajustes Visuais na Tabela de Alocação de Equipe

## Alterações Solicitadas

Com base na imagem de referência, os seguintes ajustes serão implementados:

1. **Alinhar o papel do funcionário à esquerda** (atualmente está centralizado)
2. **Mostrar o percentual de variação na coluna de Ações na linha de totais**
3. **Remover a barra de comparação "Orçado vs Planejado"** que aparece antes da tabela

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Alinhar o papel do funcionário à esquerda (linha 620)

**Antes:**
```tsx
<span className="text-xs font-semibold text-muted-foreground text-center w-full">
  {member.role}
</span>
```

**Depois:**
```tsx
<span className="text-xs font-semibold text-muted-foreground">
  {member.role}
</span>
```

Simplesmente remover as classes `text-center w-full` para que o texto fique alinhado à esquerda naturalmente.

#### 2. Remover a barra de comparação "Orçado vs Planejado" (linhas 484-522)

Remover completamente o bloco do card de comparação que aparece antes da tabela:

```tsx
{/* Budget vs Planned Comparison Card */}
{budgetRoles.length > 0 && (
  <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
    ...
  </div>
)}
```

#### 3. Adicionar percentual na coluna de Ações na linha de totais (linha 870)

Alterar a célula de Ações no footer para exibir o percentual de variação:

**Antes:**
```tsx
{isEditable && <TableCell />}
```

**Depois:**
```tsx
{isEditable && (
  <TableCell className="text-center">
    {budgetSummary.hours > 0 && (
      <div className={cn(
        "flex items-center justify-center gap-1 text-xs font-medium",
        budgetVariation.percent === 0 && "text-muted-foreground",
        budgetVariation.isUnderBudget && budgetVariation.percent !== 0 && "text-green-600 dark:text-green-400",
        !budgetVariation.isUnderBudget && "text-red-600 dark:text-red-400"
      )}>
        {budgetVariation.percent === 0 ? (
          <Minus className="h-3 w-3" />
        ) : budgetVariation.isUnderBudget ? (
          <TrendingDown className="h-3 w-3" />
        ) : (
          <TrendingUp className="h-3 w-3" />
        )}
        <span>
          {budgetVariation.percent === 0 
            ? 'No orçamento' 
            : `${Math.abs(budgetVariation.percent).toFixed(1)}%`
          }
        </span>
      </div>
    )}
  </TableCell>
)}
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Papel à esquerda | Remover `text-center w-full` da classe do span do papel |
| Remover barra de comparação | Excluir o bloco de comparação Orçado vs Planejado (linhas 484-522) |
| Percentual nos totais | Adicionar indicador de variação na coluna de Ações do footer |

---

## Resultado Esperado

1. **Papel do funcionário**: Alinhado à esquerda, abaixo do dropdown
2. **Barra de comparação**: Removida, deixando a tabela mais limpa
3. **Linha de totais**: Percentual de variação exibido na coluna de Ações como informação

