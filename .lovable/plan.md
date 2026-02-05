

# Plano: Gestão de Feriados e Folgas nas Configurações

## Objetivo

Criar uma área nas Configurações para gerenciar feriados e folgas da empresa, com feriados nacionais pré-cadastrados. Os dias cadastrados como feriados/folgas serão desabilitados no lançamento de timesheets.

---

## Estrutura Visual

### Aba de Feriados nas Configurações

```
┌─ Configurações ─────────────────────────────────────────────────────────────┐
│                                                                              │
│  [Financeiro] [Encargos/Folha] [Feriados/Folgas]                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🎉 Feriados e Folgas                           [+ Adicionar Feriado]│   │
│  │ Configure os dias que não serão contabilizados nos timesheets       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Nome                    │ Data       │ Tipo        │ Ações        │   │
│  ├──────────────────────────┼────────────┼─────────────┼──────────────┤   │
│  │  Confraternização        │ 01/01      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Carnaval                │ 03/03/2025 │ Móvel       │ [✏️] [🗑️]   │   │
│  │  Sexta-feira Santa       │ 18/04/2025 │ Móvel       │ [✏️] [🗑️]   │   │
│  │  Tiradentes              │ 21/04      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Dia do Trabalho         │ 01/05      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Corpus Christi          │ 19/06/2025 │ Móvel       │ [✏️] [🗑️]   │   │
│  │  Independência           │ 07/09      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  N. Sra. Aparecida       │ 12/10      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Finados                 │ 02/11      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Proclamação República   │ 15/11      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Natal                   │ 25/12      │ Fixo        │ [✏️] [🗑️]   │   │
│  │  Folga Aniversário       │ 15/02/2025 │ Pontual     │ [✏️] [🗑️]   │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Modal de Adicionar/Editar Feriado

```
┌─ Adicionar Feriado ─────────────────────────────────────────┐
│                                                              │
│  Nome do Feriado *                                          │
│  [Dia do Trabalhador                               ]        │
│                                                              │
│  Tipo *                                                     │
│  ○ Fixo (repete todo ano na mesma data)                     │
│  ○ Móvel (data varia por ano - ex: Carnaval)                │
│  ○ Pontual (apenas uma data específica)                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Se Fixo]                                                  │
│  ┌────────────┐  ┌────────────┐                             │
│  │ Dia    [01]│  │ Mês    [05]│                             │
│  └────────────┘  └────────────┘                             │
│                                                              │
│  [Se Móvel ou Pontual]                                      │
│  Data *                                                     │
│  [01/05/2025]                                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│                              [Cancelar] [Salvar]            │
└──────────────────────────────────────────────────────────────┘
```

### Timesheets com Feriados Desabilitados

```
┌─ Bry Tecnologia / Plataforma Discovery ─────────────────────────────────────┐
│                                                                              │
│  Funcionário         │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Total            │
│                      │ 28   │ 29   │ 30   │ 01*  │ 02   │                   │
├──────────────────────┼──────┼──────┼──────┼──────┼──────┼───────────────────│
│  Victor Couto        │ [8]  │ [8]  │ [8]  │ [--] │ [8]  │ 32h              │
│  Maria Silva         │ [4]  │ [4]  │ [4]  │ [--] │ [4]  │ 16h              │
│                                                                              │
│  * Feriado: Dia do Trabalho                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Dados

### Tabela: company_holidays

```sql
CREATE TABLE company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('fixed', 'floating', 'one_time')),
  -- Para feriados fixos: dia e mês (repete todo ano)
  fixed_day INTEGER,  -- 1-31
  fixed_month INTEGER, -- 1-12
  -- Para feriados móveis/pontuais: data específica
  specific_date DATE,
  -- Para feriados móveis: ano de referência (null = todos os anos até ser atualizado)
  reference_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;

-- Admins can manage holidays
CREATE POLICY "Admins can manage holidays" ON company_holidays
  FOR ALL USING (has_role(auth.uid(), tenant_id, 'admin'));

-- All users can view holidays in their tenant
CREATE POLICY "Users can view holidays" ON company_holidays
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));
```

---

## Tipos de Feriados

| Tipo | Descrição | Exemplo | Armazenamento |
|------|-----------|---------|---------------|
| **Fixo** | Repete todo ano na mesma data | Natal (25/12), Independência (07/09) | `fixed_day` + `fixed_month` |
| **Móvel** | Data varia por ano | Carnaval, Páscoa, Corpus Christi | `specific_date` + `reference_year` |
| **Pontual** | Data única específica | Folga extraordinária | `specific_date` |

---

## Feriados Nacionais Pré-cadastrados

Os seguintes feriados serão criados automaticamente ao inicializar o tenant:

### Feriados Fixos

| Feriado | Dia | Mês |
|---------|-----|-----|
| Confraternização Universal | 01 | 01 |
| Tiradentes | 21 | 04 |
| Dia do Trabalho | 01 | 05 |
| Independência do Brasil | 07 | 09 |
| N. Sra. Aparecida | 12 | 10 |
| Finados | 02 | 11 |
| Proclamação da República | 15 | 11 |
| Natal | 25 | 12 |

### Feriados Móveis (2025-2026)

| Feriado | 2025 | 2026 |
|---------|------|------|
| Carnaval (segunda) | 03/03 | 16/02 |
| Carnaval (terça) | 04/03 | 17/02 |
| Sexta-feira Santa | 18/04 | 03/04 |
| Corpus Christi | 19/06 | 04/06 |

---

## Implementação

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/types/holiday.ts` | Tipos para feriados |
| `src/services/holidayService.ts` | Service para CRUD de feriados |
| `src/hooks/useHolidays.ts` | Hooks React Query |
| `src/components/settings/HolidaysSettingsForm.tsx` | Componente de listagem/gestão |
| `src/components/settings/HolidayFormDialog.tsx` | Modal de adicionar/editar |
| `src/components/settings/DeleteHolidayDialog.tsx` | Dialog de confirmação de exclusão |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Settings.tsx` | Adicionar aba "Feriados/Folgas" |
| `src/hooks/useTimesheetData.ts` | Adicionar hook `useHolidaysInRange` |
| `src/components/timesheets/TimesheetWeekRow.tsx` | Desabilitar inputs em dias de feriado |
| `src/components/timesheets/TimesheetByProject.tsx` | Marcar visualmente dias de feriado |
| `src/components/timesheets/TimesheetByEmployee.tsx` | Marcar visualmente dias de feriado |

---

## Lógica de Verificação de Feriados

### Função para verificar se uma data é feriado

```typescript
function isHoliday(date: Date, holidays: Holiday[]): Holiday | null {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dateStr = format(date, 'yyyy-MM-dd');

  for (const holiday of holidays) {
    if (holiday.holiday_type === 'fixed') {
      // Feriado fixo: verificar dia e mês
      if (holiday.fixed_day === day && holiday.fixed_month === month) {
        return holiday;
      }
    } else {
      // Feriado móvel ou pontual: verificar data específica
      if (holiday.specific_date === dateStr) {
        return holiday;
      }
    }
  }
  return null;
}
```

---

## Fluxo de Seed dos Feriados

Ao criar um novo tenant (registro de empresa), executar seed dos feriados padrão via edge function `register-tenant`:

```typescript
const defaultHolidays = [
  // Fixos
  { name: 'Confraternização Universal', holiday_type: 'fixed', fixed_day: 1, fixed_month: 1 },
  { name: 'Tiradentes', holiday_type: 'fixed', fixed_day: 21, fixed_month: 4 },
  { name: 'Dia do Trabalho', holiday_type: 'fixed', fixed_day: 1, fixed_month: 5 },
  { name: 'Independência do Brasil', holiday_type: 'fixed', fixed_day: 7, fixed_month: 9 },
  { name: 'Nossa Senhora Aparecida', holiday_type: 'fixed', fixed_day: 12, fixed_month: 10 },
  { name: 'Finados', holiday_type: 'fixed', fixed_day: 2, fixed_month: 11 },
  { name: 'Proclamação da República', holiday_type: 'fixed', fixed_day: 15, fixed_month: 11 },
  { name: 'Natal', holiday_type: 'fixed', fixed_day: 25, fixed_month: 12 },
  // Móveis 2025
  { name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2025-03-03', reference_year: 2025 },
  { name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2025-03-04', reference_year: 2025 },
  { name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2025-04-18', reference_year: 2025 },
  { name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2025-06-19', reference_year: 2025 },
  // Móveis 2026
  { name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2026-02-16', reference_year: 2026 },
  { name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2026-02-17', reference_year: 2026 },
  { name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2026-04-03', reference_year: 2026 },
  { name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2026-06-04', reference_year: 2026 },
];
```

---

## Detalhes Técnicos

### Interface Holiday

```typescript
export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  holiday_type: 'fixed' | 'floating' | 'one_time';
  fixed_day: number | null;
  fixed_month: number | null;
  specific_date: string | null;
  reference_year: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HolidayFormData {
  name: string;
  holiday_type: 'fixed' | 'floating' | 'one_time';
  fixed_day?: number;
  fixed_month?: number;
  specific_date?: string;
}
```

### Visual de Feriado nos Timesheets

1. Coluna do header com fundo diferenciado (vermelho suave)
2. Input desabilitado com texto "--"
3. Tooltip com nome do feriado

---

## Sequência de Implementação

```
1. Criar migration SQL (tabela + RLS + seed para tenants existentes)
       │
       ▼
2. Criar tipos e service
       │
       ▼
3. Criar hooks
       │
       ▼
4. Criar componentes de gestão (Settings)
       │
       ▼
5. Atualizar página Settings
       │
       ▼
6. Integrar feriados nos Timesheets
       │
       ▼
7. Atualizar edge function register-tenant para seed
```

---

## Notas Importantes

1. **Feriados móveis**: O admin precisará atualizar manualmente as datas para cada ano (Carnaval, Corpus Christi, etc.)
2. **Performance**: Buscar feriados apenas para o ano relevante
3. **Visualização**: Feriados que caem no fim de semana não aparecem nos timesheets (que só mostram Seg-Sex)
4. **Exclusão**: Ao excluir um feriado, não afeta timesheets já lançados

