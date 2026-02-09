

# Adicionar Meta de Margem Bruta no Card de Margem

## Objetivo
Exibir no card de Margem da aba Financeiro a "Meta de Margem Bruta" definida nas configuracoes financeiras do admin (`gross_margin_target_percent`), como referencia de benchmark.

## O que muda

O card de Margem atualmente mostra:
- Margem Realizada (destaque)
- Margem Planejada
- Variacao (pp)

Passara a mostrar tambem:
- **Meta** (valor da `gross_margin_target_percent` das configuracoes financeiras)
- A cor do icone e do valor realizado usara a meta como referencia (verde se >= meta, vermelho se < meta * 0.5, neutro no meio)

## Layout do card atualizado

```text
+-------------------+
| Margem            |
| 25.0%  Realizado  |
| 30.0%  Planejado  |
| 28.0%  Meta       |
| -5.0pp variacao   |
+-------------------+
```

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `ProjectFinancialTab.tsx` | Importar `useFinancialSettings`, buscar `gross_margin_target_percent`, adicionar linha "Meta" no card de Margem e usar a meta como referencia para as cores |

## Detalhes tecnicos

- Importar `useFinancialSettings` de `@/hooks/useFinancialSettings`
- Chamar o hook no componente: `const { data: financialSettings } = useFinancialSettings()`
- Extrair `const marginTarget = financialSettings?.gross_margin_target_percent ?? 0`
- No card de Margem, adicionar uma linha entre "Planejado" e "variacao" mostrando `formatPercent(marginTarget)` com label "Meta"
- Atualizar a logica de cores do icone e do valor realizado para usar `marginTarget` como referencia:
  - Verde: `marginActual >= marginTarget`
  - Vermelho: `marginActual < marginTarget * 0.5`
  - Neutro: entre os dois

