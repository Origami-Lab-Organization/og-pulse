
# Plano: Ajustes na Aba de Custos do Projeto

## Resumo das Alteracoes

1. Remover visualizacao do orcamento vinculado
2. Remover mensagem de modo planejamento
3. Remover configuracao de duracao - calcular automaticamente das datas
4. Otimizar inputs para reduzir lag usando debounce e estado local

## Alteracoes por Arquivo

### 1. `src/components/projects/detail/ProjectCostsTab.tsx`

**Remover:**
- Card "Orcamento Vinculado" com botao "Ver Orcamento" (linhas 101-119)
- Alert "Modo de Planejamento" (linhas 91-99)  
- Card "Configuracao do Projeto" com duracao editavel (linhas 121-162)
- Estados `editingDuration` e `durationValue`
- Funcao `handleSaveDuration`
- Imports nao utilizados (`Settings`, `Link`, estados relacionados)

**Adicionar:**
- Calculo de duracao automatico baseado em `start_date` e `end_date`:

```typescript
import { differenceInMonths, parseISO } from 'date-fns';

// Calcular duracao do projeto a partir das datas
const durationMonths = useMemo(() => {
  const startDate = parseISO(project.start_date);
  if (project.is_continuous) {
    return 12; // Projetos continuos mostram 12 meses
  }
  if (project.end_date) {
    const endDate = parseISO(project.end_date);
    return Math.max(1, differenceInMonths(endDate, startDate) + 1);
  }
  return 1;
}, [project.start_date, project.end_date, project.is_continuous]);
```

### 2. `src/components/projects/detail/ProjectLaborSection.tsx`

**Problema:** Cada digitacao dispara `upsertMemberMonth.mutate()` imediatamente, causando requisicoes excessivas e lag.

**Solucao:** Usar estado local + debounce para agrupar mudancas:

```typescript
import { useState, useEffect, useRef } from 'react';

// Estado local para valores editados
const [localHours, setLocalHours] = useState<Record<string, number>>({});
const pendingUpdates = useRef<Record<string, NodeJS.Timeout>>({});

// Sincronizar estado local quando memberMonths mudar
useEffect(() => {
  const initial: Record<string, number> = {};
  memberMonths.forEach((mm) => {
    const key = `${mm.project_member_id}-${mm.month_number}`;
    initial[key] = mm.hours;
  });
  setLocalHours(initial);
}, [memberMonths]);

// Funcao que atualiza localmente e dispara debounced save
const handleHoursChange = useCallback(
  (memberId: string, monthNumber: number, hours: number) => {
    const key = `${memberId}-${monthNumber}`;
    
    // Atualiza estado local imediatamente (sem lag)
    setLocalHours((prev) => ({ ...prev, [key]: hours }));
    
    // Cancela timeout anterior se existir
    if (pendingUpdates.current[key]) {
      clearTimeout(pendingUpdates.current[key]);
    }
    
    // Agenda save com debounce de 500ms
    pendingUpdates.current[key] = setTimeout(() => {
      upsertMemberMonth.mutate({
        projectMemberId: memberId,
        monthNumber,
        hours: hours || 0,
      });
      delete pendingUpdates.current[key];
    }, 500);
  },
  [upsertMemberMonth]
);

// Funcao para obter horas (prioriza estado local)
const getHoursForMonth = useCallback(
  (memberId: string, monthNumber: number): number => {
    const key = `${memberId}-${monthNumber}`;
    if (key in localHours) {
      return localHours[key];
    }
    const found = memberMonths.find(
      (mm) => mm.project_member_id === memberId && mm.month_number === monthNumber
    );
    return found?.hours || 0;
  },
  [localHours, memberMonths]
);

// Cleanup dos timeouts ao desmontar
useEffect(() => {
  return () => {
    Object.values(pendingUpdates.current).forEach(clearTimeout);
  };
}, []);
```

### 3. `src/components/projects/detail/ProjectSuppliersSection.tsx`

**Mesma otimizacao com debounce:**

```typescript
// Estado local para valores editados
const [localValues, setLocalValues] = useState<Record<string, number>>({});
const pendingUpdates = useRef<Record<string, NodeJS.Timeout>>({});

// Sincronizar estado local
useEffect(() => {
  const initial: Record<string, number> = {};
  supplierMonths.forEach((sm) => {
    const key = `${sm.project_supplier_id}-${sm.month_number}`;
    initial[key] = sm.value;
  });
  setLocalValues(initial);
}, [supplierMonths]);

const handleValueChange = useCallback(
  (supplierId: string, monthNumber: number, value: number) => {
    const key = `${supplierId}-${monthNumber}`;
    
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    
    if (pendingUpdates.current[key]) {
      clearTimeout(pendingUpdates.current[key]);
    }
    
    pendingUpdates.current[key] = setTimeout(() => {
      upsertSupplierMonth.mutate({
        projectSupplierId: supplierId,
        monthNumber,
        value: value || 0,
      });
      delete pendingUpdates.current[key];
    }, 500);
  },
  [upsertSupplierMonth]
);

const getValueForMonth = useCallback(
  (supplierId: string, monthNumber: number): number => {
    const key = `${supplierId}-${monthNumber}`;
    if (key in localValues) {
      return localValues[key];
    }
    const found = supplierMonths.find(
      (sm) => sm.project_supplier_id === supplierId && sm.month_number === monthNumber
    );
    return found?.value || 0;
  },
  [localValues, supplierMonths]
);

useEffect(() => {
  return () => {
    Object.values(pendingUpdates.current).forEach(clearTimeout);
  };
}, []);
```

## Resultado Visual

### Antes

```text
┌──────────────────────────────────────────────────────────────┐
│  [!] Modo de Planejamento                                    │
│  Configure os custos planejados mes a mes...                 │
├──────────────────────────────────────────────────────────────┤
│  Orcamento Vinculado: ORC-2026-0001     [Ver Orcamento]     │
├──────────────────────────────────────────────────────────────┤
│  Configuracao do Projeto                                     │
│  Duracao do Projeto: 6 meses  [Alterar]                     │
├──────────────────────────────────────────────────────────────┤
│  [Cards de Resumo de Custos]                                │
├──────────────────────────────────────────────────────────────┤
│  [Tabelas de Custos]                                        │
└──────────────────────────────────────────────────────────────┘
```

### Depois

```text
┌──────────────────────────────────────────────────────────────┐
│  [Cards de Resumo de Custos]                                │
│  Mao de Obra | Fornecedores | Materiais | Custo Total      │
├──────────────────────────────────────────────────────────────┤
│  [Papeis do Orcamento - referencia]                         │
│  [Tabela de Alocacao de Equipe]                             │
├──────────────────────────────────────────────────────────────┤
│  [Tabela de Fornecedores]                                   │
├──────────────────────────────────────────────────────────────┤
│  [Tabela de Materiais]                                      │
└──────────────────────────────────────────────────────────────┘
```

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Remover cards de orcamento/planejamento/configuracao, calcular duracao das datas |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Adicionar estado local + debounce nos inputs de horas |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Adicionar estado local + debounce nos inputs de valores |

## Beneficios

1. **Interface mais limpa** - Remove elementos redundantes
2. **Duracao automatica** - Calculada das datas definidas na Visao Geral, sem configuracao manual
3. **Melhor UX nos inputs** - Estado local permite digitacao fluida, debounce agrupa saves
4. **Menos requisicoes** - Reducao de 90%+ nas chamadas ao banco durante edicao
