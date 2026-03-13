

## Problema Identificado

No `ProjectStats.tsx`, a lógica de "Receita no Ano" tem um bug para projetos contínuos:

**Lógica atual (linhas 19-32):**
1. `currentYearRevenue` = soma de **todas** as parcelas do ano (incluindo de projetos contínuos)
2. `continuousRevenue` = para projetos contínuos **sem nenhuma parcela** no ano → `total_value × 12`
3. Total = soma dos dois

**Problema:** Se um projeto contínuo tem parcelas para apenas alguns meses (ex: Jan-Mar), somente essas 3 parcelas entram em `currentYearRevenue`. Os meses restantes (Abr-Dez) não são projetados, pois o projeto é excluído do `continuousRevenue` por já ter parcelas no ano.

## Solução

Separar a receita de projetos contínuos da receita de projetos com prazo determinado:

```text
currentYearRevenue (projetos não-contínuos):
  → soma das parcelas do ano

continuousRevenue (projetos contínuos, exceto financiamento_inovacao):
  → para cada projeto: calcular meses ativos no ano (baseado em start_date)
  → se tem parcelas no ano: usar o MAIOR entre (soma das parcelas) e (total_value × meses_ativos)
  → se não tem parcelas: total_value × meses_ativos

totalYearRevenue = currentYearRevenue + continuousRevenue
```

## Arquivo alterado

- `src/components/projects/ProjectStats.tsx` — corrigir cálculo para:
  1. Excluir parcelas de projetos contínuos do `currentYearRevenue`
  2. Para cada projeto contínuo ativo, calcular meses no ano (desde start_date ou Jan, até Dez ou renewal_date) e multiplicar `total_value × meses`
  3. Se o projeto contínuo já tem parcelas cobrindo esses meses, usar o maior valor entre parcelas e projeção

