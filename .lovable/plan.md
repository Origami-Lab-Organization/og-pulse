
## Incluir NFs de Financiamento da Inovacao nos Valores e KPIs

### Contexto

Projetos de "Financiamento da Inovacao" nao possuem `total_value` fixo (operam sob taxa de sucesso). O valor real vem das parcelas (NFs) cadastradas manualmente. Atualmente:

1. **Coluna "Valor" na tabela**: mostra `total_value` (que pode ser 0 para esses projetos)
2. **Cards de KPI**: calculam receita/recebido com base em `installments`, mas o valor do projeto na tabela nao reflete isso

### Alteracoes

**Arquivo: `src/components/projects/ProjectsTable.tsx`**

Na coluna `total_value` (linha ~110-113), alterar a celula para que projetos com `service_line === 'financiamento_inovacao'` exibam a soma das parcelas com status `invoiced` ou `received` (NFs emitidas), em vez do `total_value`:

```typescript
cell: ({ row }) => {
  const project = row.original;
  if (project.service_line === 'financiamento_inovacao') {
    const invoicedTotal = (project.installments || [])
      .filter(i => i.status === 'invoiced' || i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value || 0), 0);
    return formatCurrency(invoicedTotal);
  }
  return formatCurrency(Number(project.total_value));
},
```

**Arquivo: `src/components/projects/ProjectStats.tsx`**

Os cards de "Receita no Ano" e "Recebido no Ano" ja funcionam com base em `installments` (parcelas), que inclui as NFs dos projetos de financiamento. Porem, o calculo de `continuousRevenue` pode estar inflando valores para projetos continuos de financiamento que tem `total_value = 0`. Ajustar para excluir projetos de financiamento da inovacao do calculo de `continuousRevenue`:

```typescript
const continuousRevenue = projects
  .filter((p) => p.is_continuous 
    && p.service_line !== 'financiamento_inovacao'
    && !(p.installments?.some(
      (i) => new Date(i.due_date).getFullYear() === currentYear
    )))
  .reduce((acc, p) => acc + Number(p.total_value || 0) * 12, 0);
```

Alem disso, para que as NFs de projetos de financiamento contem na "Receita no Ano", precisamos garantir que parcelas com status `invoiced` (NF emitida) tambem entrem no calculo, nao apenas `pending`. O calculo atual ja soma todas as parcelas do ano corrente (sem filtro de status) para "Receita no Ano", entao as NFs ja estao incluidas.

Para "Recebido no Ano", o filtro atual usa `status === 'received'` e `payment_date`, o que ja esta correto -- quando a NF for paga, entrara no recebido.

### Resumo das mudancas

| Arquivo | Mudanca |
|---|---|
| `ProjectsTable.tsx` | Coluna Valor mostra soma de NFs emitidas/recebidas para projetos de financiamento |
| `ProjectStats.tsx` | Exclui projetos de financiamento do calculo de receita continua (evita duplicidade) |

### Detalhes tecnicos

- A propriedade `service_line` ja existe em `ProjectWithRelations` (herdada de `ProjectDB`)
- As `installments` ja sao carregadas na query de projetos (via relacao `project_installments`)
- Nenhuma mudanca no banco de dados e necessaria
