
# Mostrar Meses Reais na Visao de Alocacao

## Problema atual

A aba "Visao de Alocacao" mostra colunas como "Mes 1", "Mes 2", "Mes 3", etc. Esses numeros sao relativos ao inicio de cada projeto e nao representam meses do calendario.

## Solucao

Converter o `month_number` de cada projeto para o mes/ano real do calendario, usando o `start_date` do projeto. Exemplo: se o projeto comeca em marco/2026, o mes 1 = marco/2026, mes 2 = abril/2026, etc.

As colunas da tabela passam a mostrar "Jan", "Fev", "Mar", etc. com o ano quando necessario.

## Arquivo a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/timesheets/AllocationOverview.tsx` | Converter month_number para mes calendario real, agrupar por mes/ano, exibir nomes dos meses |

## Detalhes tecnicos

### Mapeamento de month_number para mes calendario

Dentro do `queryFn`, ao processar `memberMonths`, precisamos saber de qual projeto cada `project_member_id` vem para usar o `start_date` correto:

```text
// Para cada member_month:
//   1. Encontrar o projeto do membro (via memberToProject map)
//   2. Pegar o start_date do projeto
//   3. Calcular: calendarDate = addMonths(startDate, monthNumber - 1)
//   4. Chave do mes = "YYYY-MM" (ex: "2026-03")
```

### Estrutura do EmployeeAllocation ajustada

O `months` passa de `Map<number, number>` (monthNumber -> hours) para `Map<string, number>` (chave "YYYY-MM" -> hours).

### Colunas da tabela

Em vez de gerar colunas fixas de 1 a maxMonth, coletar todas as chaves "YYYY-MM" encontradas, ordena-las cronologicamente, e exibir como:

- "Jan/26", "Fev/26", "Mar/26", etc.

Usar `format(date, "MMM/yy", { locale: ptBR })` do date-fns para exibir os nomes abreviados em portugues.

### Calculo do status geral

Permanece igual -- soma de todas as horas alocadas nos meses vs capacidade total (jornada mensal x quantidade de meses).
