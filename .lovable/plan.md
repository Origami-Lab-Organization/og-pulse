

# Corrigir Capacidade Mensal Dinamica

## Problema

A capacidade mensal (`monthlyCapacity`) esta usando o valor fixo `jornada_mensal` do cadastro do funcionario (176h), que e uma media generica. O valor correto deve considerar os dias uteis reais de cada mes, descontando fins de semana e feriados.

Exemplo para fevereiro/2026 com jornada de 8h/dia:
- 28 dias no mes
- 8 dias de fim de semana (sabados e domingos)
- 2 feriados
- **18 dias uteis x 8h = 144h** (e nao 176h)

## Solucao

Criar uma funcao `calculateMonthlyCapacity` que calcula os dias uteis do mes inteiro (de dia 1 ate o ultimo dia do mes), descontando fins de semana e feriados, e multiplica pela `jornada_diaria`. Essa funcao sera usada no lugar do campo fixo `jornada_mensal`.

## Detalhes Tecnicos

### Arquivo: `src/hooks/useMyAllocationData.ts`

1. Criar funcao `calculateMonthlyCapacity(monthKey, jornada_diaria, holidays)`:
   - Calcula de dia 1 ate o ultimo dia do mes (sem limitar ao dia de hoje, diferente de `calculateExpectedHours`)
   - Conta apenas dias uteis (seg-sex) excluindo feriados ativos
   - Retorna `diasUteis * jornada_diaria`

2. Substituir `const monthlyCapacity = empData?.jornada_mensal ?? 176` por:
   ```
   const monthlyCapacity = calculateMonthlyCapacity(monthKey, jornada_diaria, holidays)
   ```

3. A query ao employee pode deixar de buscar `jornada_mensal` (campo nao mais necessario para esta tela), mantendo apenas `jornada_diaria`.

### Nenhuma mudanca nos componentes visuais

O `MyTimesheetAllocation.tsx` ja consome `monthlyCapacity` do hook -- o valor correto sera propagado automaticamente.

### Exemplos de validacao

| Mes | Dias | Fins de semana | Feriados | Dias uteis | Capacidade (8h) |
|---|---|---|---|---|---|
| Fev/2026 | 28 | 8 | 2 | 18 | 144h |
| Mar/2026 | 31 | 8 | 0 | 23 | 184h |
| Jan/2026 | 31 | 8 | 1 | 22 | 176h |

