

## Correcao: Margem liquida sendo resetada para 50% ao editar

### Problema identificado

O `useEffect` que inicializa os valores do orcamento (linha 146) depende de `[budget, financialSettings]`. Quando o `financialSettings` termina de carregar (ou sofre refetch), o efeito re-executa e sobrescreve o `netMarginPercent` com o valor armazenado no orcamento (50%), desfazendo qualquer alteracao feita pelo usuario.

Na sessao do usuario: ele digita "20", o valor muda brevemente, mas o `useEffect` dispara novamente e reseta para 50.

### Solucao

Separar a logica de inicializacao do `useEffect` para que ele so popule os valores do orcamento **uma vez**, e nao a cada mudanca de `financialSettings`.

**Arquivo:** `src/pages/BudgetForm.tsx`

**Mudancas:**

1. Adicionar um ref `initializedRef` para rastrear se o orcamento ja foi inicializado
2. No `useEffect` que popula dados do budget (linha 146), adicionar guarda para so executar uma vez quando `budget` carrega
3. Separar a inicializacao de novos orcamentos (quando `financialSettings` carrega sem budget) em condicao propria

**Codigo aproximado:**

```typescript
const initializedRef = useRef(false);

useEffect(() => {
  if (budget && !initializedRef.current) {
    initializedRef.current = true;
    form.reset({ ... });
    setCommissionPercent(budget.commission_percent);
    setDiscountValue((budget as any).discount_value ?? 0);
    const storedNetMargin = (budget as any).net_margin_percent 
      ?? financialSettings?.net_margin_percent ?? 0;
    setNetMarginPercent(storedNetMargin);
    // ... resto da inicializacao
  } else if (!budget && financialSettings && !initializedRef.current) {
    initializedRef.current = true;
    setNetMarginPercent(financialSettings.net_margin_percent);
  }
}, [budget, financialSettings]);
```

Isso garante que:
- O valor inicial e carregado do budget (50%) na primeira renderizacao
- O usuario pode alterar livremente para 20% (ou qualquer valor >= `minNetMarginPercent`)
- O `useEffect` nao reseta o valor quando `financialSettings` muda ou sofre refetch
