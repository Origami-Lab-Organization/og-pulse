
# Plano: Corrigir Race Condition na Digitação do Timesheet

## Problema Identificado

Quando o usuário digita um valor, dá Tab e digita rapidamente no próximo campo, o sistema reseta o valor para 0. Isso ocorre porque:

1. O `onBlur` dispara uma mutation para salvar
2. Após o sucesso, as queries são invalidadas e os dados recarregados
3. O `useEffect` que sincroniza com `existingEntries` sobrescreve **todo** o estado local
4. O valor que estava sendo digitado no novo campo é perdido

## Solução

Modificar a lógica de sincronização para **preservar campos com alterações pendentes**. Em vez de sobrescrever tudo, fazer um merge inteligente:

```typescript
// ANTES (linha 74-77)
useEffect(() => {
  setHours(getInitialHours());  // Sobrescreve TUDO
}, [getInitialHours]);

// DEPOIS
useEffect(() => {
  setHours(prev => {
    const serverHours = getInitialHours();
    // Preservar valores de campos com salvamento pendente
    const merged: Record<string, number> = { ...serverHours };
    pendingSaves.forEach(date => {
      if (prev[date] !== undefined) {
        merged[date] = prev[date];  // Manter valor local
      }
    });
    return merged;
  });
}, [existingEntries, weekDays, memberId]);
```

## Alterações Necessárias

### Arquivo: `src/components/timesheets/TimesheetWeekRow.tsx`

1. **Modificar o useEffect de sincronização** para fazer merge preservando campos pendentes
2. **Adicionar ref para valores pendentes** para evitar problemas com closures stale
3. **Atualizar dependências do useEffect** para evitar loops infinitos

## Detalhes Técnicos

O problema é que `pendingSaves` dentro do `useEffect` pode estar desatualizado (stale closure). A solução usa uma ref para manter o valor mais atual:

```typescript
const pendingSavesRef = useRef<Set<string>>(new Set());

// Manter a ref sincronizada
useEffect(() => {
  pendingSavesRef.current = pendingSaves;
}, [pendingSaves]);

// Usar a ref no merge
useEffect(() => {
  setHours(prev => {
    const serverHours: Record<string, number> = {};
    weekDays.forEach((day) => {
      const entry = existingEntries.find(
        (e) => e.projectMemberId === memberId && e.workDate === day.date
      );
      serverHours[day.date] = entry?.hours ?? 0;
    });
    
    // Preservar valores com salvamento pendente
    const merged = { ...serverHours };
    pendingSavesRef.current.forEach(date => {
      if (prev[date] !== undefined) {
        merged[date] = prev[date];
      }
    });
    return merged;
  });
}, [existingEntries, weekDays, memberId]);
```

## Fluxo Corrigido

```
1. Usuário digita "8" no campo A
2. pendingSaves = { "2025-02-03" }
3. Usuário dá Tab → onBlur salva campo A
4. Usuário digita "6" no campo B
5. pendingSaves = { "2025-02-03", "2025-02-04" }
6. Mutation A completa → dados recarregados
7. useEffect detecta novos existingEntries
8. Merge: servidor[A]=8, servidor[B]=0
9. Mas B está em pendingSaves → preservar prev[B]=6
10. Resultado: { A: 8, B: 6 } ← Valor preservado!
```

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/timesheets/TimesheetWeekRow.tsx` | Corrigir lógica de merge no useEffect |

