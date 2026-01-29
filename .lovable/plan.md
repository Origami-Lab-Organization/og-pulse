
# Plano: Remover Badge da Coluna de Senioridade

## Objetivo

Substituir o componente `Badge` por texto simples na coluna de senioridade da tabela de preços, exibindo apenas o nome da senioridade.

---

## Alteração

### Arquivo: `src/components/pricing/RoleRatesTable.tsx`

**Antes (linha 113-117):**
```tsx
<TableCell>
  <Badge variant={getSeniorityBadgeVariant(roleRate.seniority)}>
    {getSeniorityLabel(roleRate.seniority)}
  </Badge>
</TableCell>
```

**Depois:**
```tsx
<TableCell>
  {getSeniorityLabel(roleRate.seniority)}
</TableCell>
```

---

## Limpeza de Código

Remover a função `getSeniorityBadgeVariant` que não será mais utilizada (linhas 40-51).

---

## Resultado Esperado

A coluna "Senioridade" exibirá apenas o texto (ex: "Júnior", "Pleno", "Sênior", "Especialista") sem o componente Badge ao redor.
