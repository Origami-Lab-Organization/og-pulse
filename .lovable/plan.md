

# Plano: Atualizar Cores do Sistema com a Paleta Fornecida

## Cores da Paleta

| Nome | HEX | HSL |
|------|-----|-----|
| Pine Teal | #184335 | 160 47% 18% |
| Celadon | #7DCE9F | 145 45% 65% |
| Amber Gold | #FFBF00 | 45 100% 50% |
| Magenta Bloom | #E83F6F | 343 78% 58% |
| Rich Cerulean | #2274A5 | 202 66% 39% |

## Mapeamento para Variaveis CSS

### Cores para Graficos (chart-1 a chart-5)

Estas cores serao usadas nos graficos de orcamento e em todo o sistema:

| Variavel | Cor | Uso |
|----------|-----|-----|
| `--chart-1` | Pine Teal (#184335) | Verde escuro - primeira categoria |
| `--chart-2` | Celadon (#7DCE9F) | Verde claro - segunda categoria |
| `--chart-3` | Amber Gold (#FFBF00) | Amarelo dourado - terceira categoria |
| `--chart-4` | Magenta Bloom (#E83F6F) | Rosa/magenta - quarta categoria |
| `--chart-5` | Rich Cerulean (#2274A5) | Azul - quinta categoria |

### Ajustes para Dark Mode

Para o modo escuro, as cores serao ligeiramente ajustadas para melhor visibilidade:

| Variavel | HSL Light | HSL Dark (mais brilhante) |
|----------|-----------|---------------------------|
| `--chart-1` | 160 47% 18% | 160 47% 35% |
| `--chart-2` | 145 45% 65% | 145 50% 65% |
| `--chart-3` | 45 100% 50% | 45 100% 55% |
| `--chart-4` | 343 78% 58% | 343 78% 62% |
| `--chart-5` | 202 66% 39% | 202 66% 50% |

## Alteracoes nos Arquivos

### 1. src/index.css

Atualizar as variaveis `--chart-1` a `--chart-5` tanto no `:root` quanto no `.dark`:

**Tema Claro (linhas 63-68):**
```css
/* Chart colors - Paleta do sistema */
--chart-1: 160 47% 18%;   /* Pine Teal */
--chart-2: 145 45% 65%;   /* Celadon */
--chart-3: 45 100% 50%;   /* Amber Gold */
--chart-4: 343 78% 58%;   /* Magenta Bloom */
--chart-5: 202 66% 39%;   /* Rich Cerulean */
```

**Tema Escuro (linhas 118-123):**
```css
/* Chart colors - Paleta do sistema (dark mode) */
--chart-1: 160 47% 35%;   /* Pine Teal - mais claro */
--chart-2: 145 50% 65%;   /* Celadon */
--chart-3: 45 100% 55%;   /* Amber Gold - mais claro */
--chart-4: 343 78% 62%;   /* Magenta Bloom - mais claro */
--chart-5: 202 66% 50%;   /* Rich Cerulean - mais claro */
```

### 2. src/components/budgets/BudgetHoursChart.tsx

Atualizar o array COLORS para usar as novas variaveis de forma consistente:

```tsx
const COLORS = [
  'hsl(var(--chart-1))',  // Pine Teal
  'hsl(var(--chart-2))',  // Celadon
  'hsl(var(--chart-3))',  // Amber Gold
  'hsl(var(--chart-4))',  // Magenta Bloom
  'hsl(var(--chart-5))',  // Rich Cerulean
];
```

### 3. src/components/budgets/BudgetCostBreakdownChart.tsx

Atualizar o objeto COLORS para usar apenas as variaveis de chart (sem usar primary/accent que podem conflitar):

```tsx
const COLORS = {
  laborCost: 'hsl(var(--chart-1))',    // Pine Teal
  suppliers: 'hsl(var(--chart-2))',    // Celadon
  materials: 'hsl(var(--chart-3))',    // Amber Gold
  adminExpenses: 'hsl(var(--chart-4))',// Magenta Bloom
  taxes: 'hsl(var(--chart-5))',        // Rich Cerulean
  commission: 'hsl(160 47% 30%)',      // Variacao Pine Teal
  netMargin: 'hsl(145 55% 55%)',       // Variacao Celadon
  discount: 'hsl(var(--destructive))', // Manter vermelho para desconto
};
```

## Resultado Esperado

- Graficos exibindo a paleta de 5 cores distintas e vibrantes
- Cores consistentes em todo o sistema
- Boa legibilidade tanto no modo claro quanto escuro
- Nenhuma cor preta nos graficos

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Atualizar variaveis chart-1 a chart-5 |
| `src/components/budgets/BudgetHoursChart.tsx` | Simplificar array COLORS |
| `src/components/budgets/BudgetCostBreakdownChart.tsx` | Atualizar objeto COLORS |

