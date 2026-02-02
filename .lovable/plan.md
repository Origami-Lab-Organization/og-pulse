

# Plano: Ajustes no Formulario de Orcamentos

## Problemas Identificados

### Problema 1: Margem Liquida Saltando para 100%

Ao analisar o codigo em `BudgetFinancialSummary.tsx` (linha 136-138):

```tsx
onChange={(e) => {
  const value = parseFloat(e.target.value) || 0;
  onNetMarginChange(Math.max(minNetMarginPercent, Math.min(value, 100)));
}}
```

O bug ocorre porque:
1. Quando o usuario apaga o campo ou digita algo invalido, `parseFloat` retorna `NaN`
2. `NaN || 0` vira `0`
3. `Math.max(20, Math.min(0, 100))` = `Math.max(20, 0)` = `20` (correto)
4. POREM, quando o usuario digita um numero como "2" (querendo digitar "25"), o valor vai imediatamente para `max(20, 2)` = `20`

O problema real e que o input nao permite digitacao intermediaria. O usuario precisa poder digitar valores livremente e a validacao deve ocorrer apenas no `onBlur`.

### Problema 2: Desconto em Valor Absoluto (R$)

Atualmente o desconto e armazenado como percentual (`discount_percent`). Precisa ser alterado para valor em Reais.

**Impacto**:
- Banco de dados: Renomear coluna `discount_percent` para `discount_value`
- Tipos: Alterar `discountPercent` para `discountValue`
- Calculo: `finalTotal = sellingPrice - discountValue` (valor direto)
- Interface: Mostrar campo em R$ em vez de %

## Solucao

### Parte 1: Corrigir Input da Margem Liquida

**Arquivos**: `BudgetFinancialSummary.tsx`

Trocar a estrategia de validacao:
- Permitir digitacao livre (sem clamp no onChange)
- Validar e aplicar minimo apenas no `onBlur`
- Mostrar feedback visual se valor estiver abaixo do minimo

```tsx
// Antes (onChange com clamp imediato)
onChange={(e) => {
  const value = parseFloat(e.target.value) || 0;
  onNetMarginChange(Math.max(minNetMarginPercent, Math.min(value, 100)));
}}

// Depois (onChange livre + onBlur com validacao)
onChange={(e) => {
  const value = parseFloat(e.target.value);
  if (!isNaN(value)) {
    onNetMarginChange(value);
  }
}}
onBlur={(e) => {
  const value = parseFloat(e.target.value) || minNetMarginPercent;
  onNetMarginChange(Math.max(minNetMarginPercent, Math.min(value, 100)));
}}
```

### Parte 2: Desconto em Valor Absoluto

#### 2.1 Migracao do Banco de Dados

```sql
-- Renomear coluna de discount_percent para discount_value
ALTER TABLE budgets RENAME COLUMN discount_percent TO discount_value;

-- Alterar valores existentes: converter percentual para valor absoluto
-- Para orcamentos existentes, calcular: discount_value = total_with_fees * (old_percent / 100)
UPDATE budgets 
SET discount_value = total_with_fees * (discount_value / 100)
WHERE discount_value > 0;
```

#### 2.2 Alteracoes nos Tipos

**Arquivo**: `src/types/budget.ts`

| Interface | Campo Antigo | Campo Novo |
|-----------|--------------|------------|
| BudgetDB | discount_percent | discount_value |
| CreateBudgetInput | discountPercent | discountValue |
| calculateBudgetTotals | discountPercent param | discountValue param |
| BudgetCalculation | (sem mudanca - ja tem `discount: number`) |

#### 2.3 Alteracao na Funcao de Calculo

**Arquivo**: `src/types/budget.ts` - funcao `calculateBudgetTotals`

```tsx
// Antes
const discount = sellingPrice * (discountPercent / 100);
const finalTotal = sellingPrice - discount;

// Depois
const discount = discountValue;
const finalTotal = sellingPrice - discount;
```

#### 2.4 Alteracoes no Componente

**Arquivo**: `BudgetFinancialSummary.tsx`

| Antes | Depois |
|-------|--------|
| `discountPercent: number` | `discountValue: number` |
| `onDiscountChange: (value: number) => void` | (mantido, mas agora recebe R$) |
| Input com `%` no final | Input com `R$` no inicio |
| `max={100}` | Remover max (ou colocar max = sellingPrice) |

```tsx
// Antes
<Input ... value={discountPercent} />
<span className="text-sm text-muted-foreground">%</span>

// Depois
<span className="text-sm text-muted-foreground">R$</span>
<Input ... value={discountValue} />
```

#### 2.5 Alteracoes no Formulario

**Arquivo**: `BudgetForm.tsx`

| Antes | Depois |
|-------|--------|
| `discountPercent` state | `discountValue` state |
| `setDiscountPercent` | `setDiscountValue` |
| Inicializar com 0 | Inicializar com 0 |

#### 2.6 Alteracoes no Servico

**Arquivo**: `budgetService.ts`

| Antes | Depois |
|-------|--------|
| `discount_percent: input.discountPercent` | `discount_value: input.discountValue` |
| (em todas as queries de insert/update) | |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetFinancialSummary.tsx` | Corrigir input margem + mudar desconto para R$ |
| `src/types/budget.ts` | Alterar tipos e funcao de calculo |
| `src/pages/BudgetForm.tsx` | Alterar state de desconto |
| `src/services/budgetService.ts` | Alterar campos de insert/update |
| Migracao SQL | Renomear coluna no banco |

## Secao Tecnica Detalhada

### Por que o input da margem "salta"?

Inputs HTML `type="number"` com validacao no `onChange` interferem na experiencia de digitacao. Quando o usuario digita "2" querendo escrever "25", o sistema imediatamente aplica `Math.max(20, 2)` = 20, sobrescrevendo o valor antes do usuario terminar.

A solucao e:
1. Permitir qualquer valor durante digitacao (`onChange` sem clamp)
2. Aplicar validacao apenas quando o usuario sair do campo (`onBlur`)
3. Opcionalmente, mostrar indicador visual de "valor invalido" durante digitacao

### Impacto da Mudanca de Desconto

A mudanca de percentual para valor absoluto requer:
1. **Migracao de dados**: Converter valores existentes no banco
2. **Compatibilidade**: Orcamentos antigos serao convertidos automaticamente
3. **UX**: Input mais intuitivo para usuarios que pensam em "dar R$ 500 de desconto"

### Validacao do Desconto

O desconto maximo deveria ser o proprio preco de venda (`sellingPrice`), para evitar valores finais negativos:

```tsx
onBlur={(e) => {
  const value = parseFloat(e.target.value) || 0;
  onDiscountChange(Math.max(0, Math.min(value, calculation.sellingPrice)));
}}
```

