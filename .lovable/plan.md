

# Capacidade com Dias Uteis Reais (descontando finais de semana e feriados)

## Problema

Atualmente a capacidade e calculada como `jornada_diaria * 22` (fixo), sem considerar os feriados cadastrados. Todos os funcionarios mostram 176h (8h x 22) ou 132h (6h x 22), mesmo que o mes tenha feriados que reduzem os dias uteis.

## Solucao

Calcular os dias uteis reais do mes selecionado: contar dias de segunda a sexta, descontando feriados fixos e moveis que caiam em dias uteis.

## Mudancas

### Arquivo: `src/hooks/useAnalyticsData.ts`

1. **Buscar feriados**: Adicionar uma query paralela para buscar `company_holidays` do tenant (ativos).

2. **Criar funcao `countWorkingDays`**: Recebe a data inicio e fim do periodo + lista de feriados. Itera cada dia do intervalo, conta apenas dias uteis (seg-sex) que nao sejam feriados.

3. **Substituir `* 22` pelo calculo real**: Usar `countWorkingDays(startDate, endDate, holidays)` para obter os dias uteis do mes, e calcular `capacity = jornadaDiaria * diasUteis`.

### Logica da funcao `countWorkingDays`

```text
Para cada dia entre startDate e endDate:
  - Pular se for sabado (6) ou domingo (0)
  - Pular se for feriado fixo (fixed_day/fixed_month coincide)
  - Pular se for feriado movel/pontual (specific_date coincide)
  - Senao, incrementar contador
Retornar total de dias uteis
```

### Exemplo pratico

Fevereiro 2026 tem 28 dias, 20 dias uteis (seg-sex). Se houver Carnaval (16 e 17 fev) caindo em dias uteis, ficam 18 dias uteis. Um funcionario com 8h/dia teria capacidade de 144h em vez de 176h.

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAnalyticsData.ts` | Buscar feriados, criar `countWorkingDays`, substituir `* 22` pelo calculo real |

## Detalhes Tecnicos

### Query adicional de feriados (paralela)

```typescript
supabase
  .from('company_holidays')
  .select('holiday_type, fixed_day, fixed_month, specific_date, is_active')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
```

### Funcao countWorkingDays

```typescript
function countWorkingDays(start: Date, end: Date, holidays: any[]): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const day = current.getDate();
      const month = current.getMonth() + 1;
      const dateStr = format(current, 'yyyy-MM-dd');
      const isHoliday = holidays.some(h =>
        h.holiday_type === 'fixed'
          ? h.fixed_day === day && h.fixed_month === month
          : h.specific_date === dateStr
      );
      if (!isHoliday) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
```

### Substituicao no calculo de capacidade

```typescript
// Antes
const capacity = jornadaDiaria * 22;

// Depois
const workingDays = countWorkingDays(filters.startDate, filters.endDate, holidays);
const capacity = jornadaDiaria * workingDays;
```

O valor de `workingDays` e calculado uma unica vez e reutilizado para todos os funcionarios do mesmo periodo.
