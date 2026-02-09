

# Plano: Ajustes na Tela de Projetos

## Alteracao 1 - Coluna de Cliente: mostrar apenas Nome Fantasia

**Arquivo:** `src/components/projects/ProjectsTable.tsx`

Atualmente a coluna mostra `company_name` (Razao Social) como principal e `trading_name` (Nome Fantasia) como secundario. Vamos inverter a logica: mostrar apenas o `trading_name`, usando `company_name` como fallback caso nao tenha nome fantasia.

```text
Antes:                          Depois:
  Razao Social S.A.               Nome Fantasia
  Nome Fantasia                    (sem segunda linha)
```

## Alteracao 2 - Valor Contratado: receita do ano corrente via parcelas

**Arquivo:** `src/components/projects/ProjectStats.tsx`

O calculo atual usa `total_value` do projeto (com anualizacao para continuos). Isso nao reflete a receita real do ano quando projetos cruzam anos.

A nova logica soma o valor de **todas as parcelas com vencimento no ano corrente**, independente do status (pending, invoiced, received, overdue). Isso captura corretamente a receita planejada para o ano. Para projetos continuos (que nao tem parcelas), mantemos a anualizacao (mensalidade x 12).

```typescript
// Receita do ano = soma das parcelas do ano corrente
const currentYearRevenue = installments
  .filter((i) => new Date(i.due_date).getFullYear() === currentYear)
  .reduce((acc, i) => acc + Number(i.value || 0), 0);

// Para projetos continuos sem parcelas, somar mensalidade x 12
const continuousRevenue = projects
  .filter((p) => p.is_continuous && !(p.installments?.some(
    (i) => new Date(i.due_date).getFullYear() === currentYear
  )))
  .reduce((acc, p) => acc + Number(p.total_value || 0) * 12, 0);

const totalYearRevenue = currentYearRevenue + continuousRevenue;
```

O card "Valor Contratado" passa a exibir:
- **Titulo:** Receita no Ano
- **Valor:** Soma das parcelas do ano
- **Descricao:** Projecao 2026

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/ProjectsTable.tsx` | Coluna cliente: mostrar `trading_name` com fallback para `company_name` |
| `src/components/projects/ProjectStats.tsx` | Card valor: calcular receita baseada em parcelas do ano corrente |

