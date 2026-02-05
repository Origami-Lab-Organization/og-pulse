

# Plano: Corrigir Cálculo do Total de Horas no Dialog de Edição Admin

## Problema Identificado

O total da semana (19.0h) está incorreto porque o estado `hours` não está sincronizado corretamente com os dados exibidos nos inputs.

### Causa Raiz

1. O estado `hours` é inicializado com `useState(initialHours)` na **linha 81**
2. O `initialHours` é um `useMemo` que recalcula quando as props mudam
3. **Porém**, `useState` só usa o valor inicial no primeiro render - mudanças posteriores em `initialHours` são ignoradas
4. Quando o dialog reabre, o `handleOpenChange` tenta fazer `setHours(initialHours)`, mas nesse momento o `initialHours` pode estar desatualizado (closure stale)

### Fluxo do Bug

```
1. Dialog abre pela primeira vez → hours inicializado com dados do servidor (19h)
2. Usuário digita 0 em todos os campos → hours atualizado para 0 em cada dia editado
3. MAS o cálculo do total na linha 208 soma Object.values(memberHours)
4. O memberHours contém mix de valores: alguns editados (0), outros do initialHours original
5. Se o usuário não clicou em todos os dias, valores antigos permanecem
```

---

## Solução

### 1. Sincronizar Estado Quando Dialog Abre

Garantir que o `hours` sempre seja reinicializado com os dados mais recentes do servidor quando o dialog abre.

O problema é que dentro do `handleOpenChange`, o `initialHours` pode estar com valor antigo (stale closure). Precisamos recalcular diretamente:

```typescript
// ANTES (linha 84-90)
const handleOpenChange = (isOpen: boolean) => {
  if (isOpen) {
    setHours(initialHours);  // ← initialHours pode estar stale
    setJustification('');
  }
  onOpenChange(isOpen);
};

// DEPOIS - Recalcular diretamente
const handleOpenChange = (isOpen: boolean) => {
  if (isOpen) {
    // Recalcular horas iniciais diretamente
    const freshHours: Record<string, Record<string, number>> = {};
    projects.forEach((project) => {
      project.members.forEach((member) => {
        weekDays.forEach((day) => {
          const entry = timesheetEntries.find(
            (e) => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          if (!freshHours[member.memberId]) freshHours[member.memberId] = {};
          freshHours[member.memberId][day.date] = entry?.hours ?? 0;
        });
      });
    });
    setHours(freshHours);
    setJustification('');
  }
  onOpenChange(isOpen);
};
```

### 2. Alternativa Mais Limpa - Usar useEffect

Adicionar um `useEffect` que reseta o estado quando o dialog abre:

```typescript
useEffect(() => {
  if (open) {
    // Recalcular estado inicial quando dialog abre
    const freshHours: Record<string, Record<string, number>> = {};
    projects.forEach((project) => {
      project.members.forEach((member) => {
        weekDays.forEach((day) => {
          const entry = timesheetEntries.find(
            (e) => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          if (!freshHours[member.memberId]) freshHours[member.memberId] = {};
          freshHours[member.memberId][day.date] = entry?.hours ?? 0;
        });
      });
    });
    setHours(freshHours);
    setJustification('');
  }
}, [open, projects, weekDays, timesheetEntries]);
```

### 3. Garantir Cálculo Correto do Total

O cálculo do total na linha 208 deve considerar apenas os dias da semana atual:

```typescript
// ANTES (linha 207-208)
const memberHours = hours[member.memberId] || {};
const totalHours = Object.values(memberHours).reduce((sum, h) => sum + (h || 0), 0);

// DEPOIS - Somar apenas os dias da semana atual
const memberHours = hours[member.memberId] || {};
const totalHours = weekDays.reduce((sum, day) => {
  const dayHours = memberHours[day.date] ?? 0;
  return sum + dayHours;
}, 0);
```

---

## Alteração no Arquivo

### `src/components/timesheets/AdminWeekEditDialog.tsx`

| Linha | Alteração |
|-------|-----------|
| 81 | Manter inicialização vazia ou com {} |
| 83-90 | Substituir por useEffect para sincronizar estado |
| 207-208 | Corrigir cálculo do total para usar apenas weekDays |

---

## Código Final

```typescript
// Inicializar vazio - será preenchido pelo useEffect
const [hours, setHours] = useState<Record<string, Record<string, number>>>({});

// Sincronizar quando dialog abre ou dados mudam
useEffect(() => {
  if (open) {
    const freshHours: Record<string, Record<string, number>> = {};
    projects.forEach((project) => {
      project.members.forEach((member) => {
        weekDays.forEach((day) => {
          const entry = timesheetEntries.find(
            (e) => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          if (!freshHours[member.memberId]) freshHours[member.memberId] = {};
          freshHours[member.memberId][day.date] = entry?.hours ?? 0;
        });
      });
    });
    setHours(freshHours);
    setJustification('');
  }
}, [open, projects, weekDays, timesheetEntries]);

// handleOpenChange simplificado
const handleOpenChange = (isOpen: boolean) => {
  onOpenChange(isOpen);
};

// Total corrigido (dentro do map de members)
const memberHours = hours[member.memberId] || {};
const totalHours = weekDays.reduce((sum, day) => {
  return sum + (memberHours[day.date] ?? 0);
}, 0);
```

---

## Resumo

- **Problema**: Estado `hours` não sincronizado corretamente com dados do servidor
- **Causa**: `useState` com valor inicial não reage a mudanças nas props
- **Solução**: Usar `useEffect` para sincronizar estado quando dialog abre
- **Bonus**: Corrigir cálculo do total para usar apenas os dias da semana atual

