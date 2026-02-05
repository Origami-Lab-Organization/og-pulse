

# Plano: Remover Coluna de Senioridade e Incluir no Papel

## Alterações Solicitadas

Com base na imagem de referência, os seguintes ajustes serão implementados:

1. **Remover a coluna "Senioridade"** da tabela
2. **Incluir a senioridade orçada no nome do papel** (Ex: "Gerente de Produto Sênior")

## Nova Estrutura Visual

```
┌──────────────────────────────────┬──────────────┬───────────┬───────────┬────────┐
│ Funcionário                      │ R$/h         │ Mês 1     │ Mês 2     │ ...    │
├──────────────────────────────────┼──────────────┼───────────┼───────────┼────────┤
│ [Victor Couto ▼]                 │ R$ 119,05    │ 84        │ 84        │ ...    │
│ Gerente de Produto Sênior        │ R$ 90,00     │ 84h       │ 84h       │ ...    │
├──────────────────────────────────┼──────────────┼───────────┼───────────┼────────┤
│ [Italo Cesar Castro ▼]           │ R$ 59,52     │ 168       │ 168       │ ...    │
│ Engenheiro de Software Pleno     │ R$ 60,00     │ 168h      │ 168h      │ ...    │
└──────────────────────────────────┴──────────────┴───────────┴───────────┴────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Remover o cabeçalho "Senioridade" (linha 494)

**Antes:**
```tsx
<TableHead className="min-w-[100px]">Senioridade</TableHead>
```

**Depois:**
Remover esta linha completamente.

#### 2. Atualizar o texto do papel para incluir senioridade (linhas 581-583)

**Antes:**
```tsx
<span className="text-xs font-semibold text-muted-foreground">
  {member.role}
</span>
```

**Depois:**
```tsx
<span className="text-xs font-semibold text-muted-foreground">
  {member.role}{budgetSeniorityLabel ? ` ${budgetSeniorityLabel}` : ''}
</span>
```

#### 3. Remover a célula de Senioridade do corpo da tabela (linhas 587-599)

Remover completamente o bloco:
```tsx
{/* Column 2: Seniority */}
<TableCell className="p-2">
  <div className="flex flex-col gap-0.5 items-center text-center">
    <span className={member.employee ? "font-medium" : "text-muted-foreground"}>
      {employeeSeniority || '-'}
    </span>
    {budgetData.budgetSeniority && (
      <span className="text-xs text-muted-foreground">
        {budgetSeniorityLabel}
      </span>
    )}
  </div>
</TableCell>
```

#### 4. Remover a célula vazia de Senioridade do rodapé (linha 760)

**Antes:**
```tsx
<TableCell />
<TableCell />
```

**Depois:**
```tsx
<TableCell />
```

Remover apenas a primeira célula vazia (que correspondia à coluna Senioridade).

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Remover coluna Senioridade | Header, Body e Footer |
| Papel com senioridade | "Gerente de Produto Sênior" ao invés de apenas "Gerente de Produto" |

---

## Resultado Esperado

1. **Tabela mais compacta**: Uma coluna a menos
2. **Papel descritivo**: Nome do papel + senioridade orçada na mesma linha
3. **Layout limpo**: Informação de senioridade integrada no contexto do papel

