

# Plano: Ajustes nas Metricas da Pagina de Projetos

## Alteracoes

### 1. Card "Parcelas Atrasadas" - filtrar por ano corrente e mostrar valor recebido

Atualmente mostra apenas a contagem de parcelas atrasadas (todas). Vamos:
- Filtrar parcelas atrasadas apenas do ano corrente (2026)
- Adicionar uma segunda linha (description) mostrando o valor ja recebido no ano corrente

### 2. Card "Valor Contratado" - considerar projetos continuos como receita anualizada

Atualmente soma `total_value` de todos os projetos. Para projetos continuos (`is_continuous = true`), o `total_value` representa a mensalidade. Vamos multiplicar por 12 para representar o valor anual.

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/ProjectStats.tsx` | Ajustar calculo de valor contratado e parcelas atrasadas |

## Detalhes Tecnicos

### ProjectStats.tsx

**Valor Contratado:**
```typescript
const currentYear = new Date().getFullYear();

const totalValue = projects.reduce((acc, p) => {
  const value = Number(p.total_value || 0);
  if (p.is_continuous) {
    return acc + (value * 12); // mensalidade x 12
  }
  return acc + value;
}, 0);
```

**Parcelas Atrasadas (ano corrente + valor recebido):**
```typescript
const currentYearInstallments = installments.filter(
  (i) => new Date(i.due_date).getFullYear() === currentYear
);

const overdueInstallments = currentYearInstallments.filter(
  (i) => i.status === 'overdue'
).length;

const receivedValue = currentYearInstallments
  .filter((i) => i.status === 'received')
  .reduce((acc, i) => acc + Number(i.value || 0), 0);
```

**Card de Parcelas Atrasadas** - description muda para mostrar o valor recebido:
```typescript
{
  title: 'Parcelas Atrasadas',
  value: overdueInstallments,
  icon: AlertTriangle,
  description: `Recebido: ${formatCurrency(receivedValue)}`,
  variant: overdueInstallments > 0 ? 'destructive' : 'default',
}
```

**Card de Valor Contratado** - description atualizada:
```typescript
{
  title: 'Valor Contratado',
  value: formatCurrency(totalValue),
  icon: DollarSign,
  description: `Projecao ${currentYear}`,
}
```

## Resultado Esperado

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Total         │ │ Ativos       │ │ Valor Contratado  │ │ Parcelas Atrasadas│
│ 6             │ │ 3            │ │ R$ 1.050.801,08   │ │ 0                 │
│ Projetos cad. │ │ Em andamento │ │ Projecao 2026     │ │ Recebido: R$ ...  │
└──────────────┘ └──────────────┘ └──────────────────┘ └──────────────────┘
```
