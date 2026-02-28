

# Indicador de "Horas Esperadas" na Minha Alocacao

## Conceito

Adicionar um marcador visual na barra de capacidade mensal que indica quantas horas o funcionario ja deveria ter lancado ate hoje, baseado na sua jornada diaria e nos dias uteis ja transcorridos no mes (excluindo fins de semana e feriados cadastrados).

Por exemplo: dia 28/02, com 20 dias uteis no mes e jornada de 8h/dia, o esperado seria 160h.

## Representacao Visual

Na barra de capacidade mensal, alem dos segmentos existentes (Realizado / Planejado restante / Livre), sera adicionado um **marcador vertical** (linha fina) na posicao correspondente ao percentual de horas esperadas. Isso funciona como uma "meta do dia" -- o usuario ve rapidamente se esta adiantado ou atrasado.

```text
Capacidade mensal                    120h realizado de 176h
[====Verde Escuro====][==Verde Claro==][     Cinza      ]
                                    |  <-- marcador "Esperado: 152h"
```

O tooltip da barra incluira tambem o valor esperado. Uma nova entrada na legenda sera adicionada para explicar o marcador.

## Detalhes Tecnicos

### Arquivo: `src/hooks/useMyAllocationData.ts`

1. Buscar tambem `jornada_diaria` do employee (ja existe na tabela, default 8)
2. Buscar os feriados do tenant para calcular dias uteis
3. Calcular `expectedHours`:
   - Determinar o primeiro e ultimo dia do mes (`monthKey`)
   - O limite superior e `min(hoje, ultimo dia do mes)` -- para meses passados, usa o mes inteiro
   - Contar dias uteis (seg-sex) de dia 1 ate o limite, excluindo feriados ativos
   - `expectedHours = diasUteis * jornada_diaria`
4. Adicionar `expectedHours` e `jornada_diaria` ao retorno `MyAllocationData`

### Arquivo: `src/components/timesheets/MyTimesheetAllocation.tsx`

1. Calcular `expectedPercent = (expectedHours / monthlyCapacity) * 100`
2. Na barra `SegmentedBar` principal (capacidade mensal), sobrepor um marcador vertical (div absoluto com borda) na posicao `expectedPercent%`
3. Atualizar o tooltip para incluir "Esperado: Xh"
4. Atualizar a legenda para incluir o marcador "Esperado"
5. Atualizar o texto do header para incluir a informacao de esperado, como: "120h realizado de 176h (esperado: 152h)"

### Calculo de dias uteis (dentro do hook)

```text
Para cada dia de 1 ate min(hoje, ultimoDiaDoMes):
  - Se dia da semana e sabado ou domingo: pular
  - Se dia e feriado ativo (fixo ou especifico): pular
  - Caso contrario: contar como dia util
expectedHours = diasUteis * jornada_diaria
```

Os feriados serao buscados via query direta no hook (tabela `holidays`), usando a mesma logica de `isHoliday` ja existente no projeto.

### Arquivos impactados

- `src/hooks/useMyAllocationData.ts` -- adicionar campo `expectedHours` e logica de calculo
- `src/components/timesheets/MyTimesheetAllocation.tsx` -- adicionar marcador visual e legenda

