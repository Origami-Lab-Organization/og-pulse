
# Plano: Corrigir Estatisticas de Custos de Funcionarios

## Alteracoes Necessarias

O arquivo `src/components/employees/EmployeeStats.tsx` precisa de tres ajustes:

### 1. Alterar Filtro para Incluir Todos Exceto Inativos

Atualmente o codigo filtra apenas `status === 'ativo'`. Precisa mudar para excluir apenas `status === 'inativo'`:

```typescript
// DE:
.filter((e) => e.status === 'ativo')

// PARA:
.filter((e) => e.status !== 'inativo')
```

Aplicar em:
- Linha 26: calculo de `totalMonthlyCost`
- Linha 60: calculo de `totalMonthlyProvision`

### 2. Remover Exibicao do Custo Anual

Remover a linha 93 que exibe o custo anual e mover a provisao para `subValue`:

```typescript
// DE (linhas 91-97):
{
  label: 'Custo Mensal Total',
  value: formatCurrency(totalMonthlyCost),
  subValue: `Anual: ${formatCurrency(totalAnnualCost)}`,
  subValue2: `Provisão Mensal: ${formatCurrency(totalMonthlyProvision)}`,
  icon: DollarSign,
  color: 'bg-accent/20 text-foreground',
}

// PARA:
{
  label: 'Custo Mensal Total',
  value: formatCurrency(totalMonthlyCost),
  subValue: `Provisão Mensal: ${formatCurrency(totalMonthlyProvision)}`,
  icon: DollarSign,
  color: 'bg-accent/20 text-foreground',
}
```

### 3. Remover Variavel e Interface Nao Usadas

- Remover linha 56: `const totalAnnualCost = totalMonthlyCost * 12;`
- Remover `subValue2` da interface `StatItem` (linha 14)

---

## Resumo das Alteracoes

| Linha | Alteracao |
|-------|-----------|
| 14 | Remover `subValue2` da interface |
| 26 | Mudar filtro para `e.status !== 'inativo'` |
| 56 | Remover calculo de `totalAnnualCost` |
| 60 | Mudar filtro para `e.status !== 'inativo'` |
| 93 | Remover linha do custo anual |
| 94 | Mover provisao para `subValue` |
| 114-116 | Remover renderizacao de `subValue2` |

---

## Resultado Esperado

```text
+--------------------------------------+
| [$]  Custo Mensal Total              |
|      R$ 60.550,00                    |
|      Provisao Mensal: R$ 350,00      |
+--------------------------------------+
```

---

## Criterios de Aceite

1. Custo mensal total soma TODOS os funcionarios exceto "inativo"
2. Custo anual NAO aparece mais
3. Provisao mensal aparece abaixo do custo mensal
4. Provisao mensal soma todos funcionarios exceto "inativo"
