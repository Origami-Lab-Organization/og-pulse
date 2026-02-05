
# Plano: Reorganização da Tabela com Valores Orçados Abaixo

## Entendimento do Pedido

A nova estrutura da tabela deve seguir um padrão consistente:
- **Linha superior**: Valor planejado/selecionado (funcionário, senioridade, custo, horas)
- **Linha inferior**: Valor do orçamento original (papel, senioridade orçada, custo orçado, horas orçadas)

## Nova Estrutura Visual

```
┌─────────────────────────┬──────────────┬──────────────┬───────────┬───────────┬────────┐
│ Funcionário             │ Senioridade  │ R$/h         │ Mês 1     │ Mês 2     │ ...    │
├─────────────────────────┼──────────────┼──────────────┼───────────┼───────────┼────────┤
│ [Victor Couto ▼]        │ Sênior       │ R$ 119,05    │ 84        │ 84        │ ...    │
│ Gerente de Produto      │ Sênior       │ R$ 90,00     │ 84h orç.  │ 84h orç.  │ ...    │
├─────────────────────────┼──────────────┼──────────────┼───────────┼───────────┼────────┤
│ [Selecionar ▼]          │ -            │ -            │ 168       │ 168       │ ...    │
│ Engenheiro de Software  │ Pleno        │ R$ 60,00     │ 168h orç. │ 168h orç. │ ...    │
└─────────────────────────┴──────────────┴──────────────┴───────────┴───────────┴────────┘
```

---

## Lógica de Exibição por Coluna

### Coluna 1: Funcionário
- **Linha 1**: Select dropdown (ou nome do funcionário se não editável)
- **Linha 2**: Nome do papel em **negrito, fonte menor** (sempre visível, vem do orçamento)

### Coluna 2: Senioridade
- **Linha 1**: Senioridade do funcionário selecionado (preenchida ao selecionar)
- **Linha 2**: Senioridade orçada em fonte menor/suave

### Coluna 3: R$/h
- **Linha 1**: Custo real do funcionário (calculado)
- **Linha 2**: Custo orçado (do budget role) em fonte menor/suave

### Colunas de Mês
- **Linha 1**: Horas planejadas (editável no modo de edição)
- **Linha 2**: Horas orçadas em fonte menor/suave (ex: "84h orç.")

### Coluna Horas Total
- **Linha 1**: Total de horas planejadas
- **Linha 2**: Total de horas orçadas em fonte menor

### Coluna Custo Total
- **Linha 1**: Custo planejado total
- **Linha 2**: Custo orçado total em fonte menor

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Adicionar Cálculo de Dados Orçados por Membro

Criar um useMemo para obter os dados do orçamento original para cada papel:

```typescript
const budgetDataByMember = useMemo(() => {
  const result: Record<string, {
    budgetSeniority: string;
    budgetHourlyRate: number;
    budgetHoursByMonth: Record<number, number>;
    budgetTotalHours: number;
  }> = {};
  
  members.forEach(member => {
    if (member.budget_role_id) {
      const budgetRole = budgetRoles.find(r => r.id === member.budget_role_id);
      if (budgetRole) {
        const hoursByMonth: Record<number, number> = {};
        budgetRole.months?.forEach(m => {
          hoursByMonth[m.month_number] = m.hours;
        });
        result[member.id] = {
          budgetSeniority: budgetRole.seniority,
          budgetHourlyRate: budgetRole.hourly_rate,
          budgetHoursByMonth: hoursByMonth,
          budgetTotalHours: budgetRole.months?.reduce((sum, m) => sum + m.hours, 0) || 0,
        };
      }
    }
    // Se não tem budget role, valores ficam vazios
    if (!result[member.id]) {
      result[member.id] = {
        budgetSeniority: '',
        budgetHourlyRate: 0,
        budgetHoursByMonth: {},
        budgetTotalHours: 0,
      };
    }
  });
  
  return result;
}, [members, budgetRoles]);
```

#### 2. Alterar Header da Tabela

Remover colunas "Papel" e "Orç. R$/h" separadas:

```tsx
<TableHeader>
  <TableRow>
    <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">
      Funcionário
    </TableHead>
    <TableHead className="min-w-[100px]">Senioridade</TableHead>
    <TableHead className="text-right min-w-[100px]">R$/h</TableHead>
    {months.map((m) => (
      <TableHead key={m} className="text-center min-w-[80px]">
        Mês {m}
      </TableHead>
    ))}
    <TableHead className="text-center min-w-[100px]">Horas</TableHead>
    <TableHead className="text-center min-w-[120px]">Custo</TableHead>
    {isEditable && (
      <TableHead className="text-center min-w-[80px]">Ações</TableHead>
    )}
  </TableRow>
</TableHeader>
```

#### 3. Refatorar Corpo da Tabela

Cada célula terá duas linhas (valor planejado + orçado):

```tsx
{members.map((member) => {
  const budgetData = budgetDataByMember[member.id];
  const realCost = getRealHourlyCost(member);
  const memberTotal = memberTotals[member.id];
  const employeeSeniority = member.employee 
    ? SENIORITY_OPTIONS.find(s => s.value === member.seniority)?.label 
    : null;
  const budgetSeniorityLabel = SENIORITY_OPTIONS.find(
    s => s.value === budgetData.budgetSeniority
  )?.label || budgetData.budgetSeniority;

  return (
    <TableRow key={member.id}>
      {/* Coluna 1: Funcionário + Papel */}
      <TableCell className="sticky left-0 bg-background z-10 p-2 min-w-[220px]">
        <div className="flex flex-col gap-1">
          {isEditable ? (
            <Select ...>...</Select>
          ) : (
            <span className="font-medium">
              {member.employee?.nome || 'Não atribuído'}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">
            {member.role}
          </span>
        </div>
      </TableCell>
      
      {/* Coluna 2: Senioridade */}
      <TableCell className="p-2">
        <div className="flex flex-col gap-0.5">
          <span className={member.employee ? "font-medium" : "text-muted-foreground"}>
            {employeeSeniority || '-'}
          </span>
          {budgetData.budgetSeniority && (
            <span className="text-xs text-muted-foreground">
              {budgetSeniorityLabel}
            </span>
          )}
        </div>
      </TableCell>
      
      {/* Coluna 3: R$/h */}
      <TableCell className="text-right p-2">
        <div className="flex flex-col gap-0.5">
          <span className={member.employee ? "font-medium" : "text-muted-foreground"}>
            {member.employee ? formatCurrency(realCost) : '-'}
          </span>
          {budgetData.budgetHourlyRate > 0 && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(budgetData.budgetHourlyRate)}
            </span>
          )}
        </div>
      </TableCell>
      
      {/* Colunas de Mês */}
      {months.map((monthNum) => {
        const plannedHours = getHoursForMonth(member.id, monthNum);
        const budgetHours = budgetData.budgetHoursByMonth[monthNum] || 0;
        
        return (
          <TableCell key={monthNum} className="text-center p-1">
            <div className="flex flex-col gap-0.5">
              {hoursEditMode ? (
                <Input ... />
              ) : (
                <span>{plannedHours > 0 ? plannedHours : '-'}</span>
              )}
              {budgetHours > 0 && (
                <span className="text-xs text-muted-foreground">
                  {budgetHours}h orç.
                </span>
              )}
            </div>
          </TableCell>
        );
      })}
      
      {/* Coluna Horas Total */}
      <TableCell className="text-center p-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{memberTotal.plannedHours}h</span>
          {budgetData.budgetTotalHours > 0 && (
            <span className="text-xs text-muted-foreground">
              {budgetData.budgetTotalHours}h orç.
            </span>
          )}
        </div>
      </TableCell>
      
      {/* Coluna Custo Total */}
      <TableCell className="text-center p-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{formatCurrency(memberTotal.plannedValue)}</span>
          {budgetData.budgetTotalHours > 0 && budgetData.budgetHourlyRate > 0 && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(budgetData.budgetTotalHours * budgetData.budgetHourlyRate)}
            </span>
          )}
        </div>
      </TableCell>
      
      {/* Coluna Ações */}
      {isEditable && <TableCell>...</TableCell>}
    </TableRow>
  );
})}
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Nova coluna "Funcionário" | Select + papel abaixo em negrito |
| Coluna "Senioridade" com duas linhas | Planejado em cima, orçado abaixo |
| Coluna "R$/h" com duas linhas | Custo real em cima, orçado abaixo |
| Colunas de mês com duas linhas | Horas planejadas em cima, orçadas abaixo |
| Remover coluna "Orç. R$/h" separada | Integrada na coluna R$/h |
| Remover coluna "Papel" separada | Integrada na coluna Funcionário |

---

## Resultado Esperado

1. **Tabela mais compacta**: Menos colunas horizontais
2. **Comparação visual imediata**: Planejado vs orçado em cada célula
3. **Hierarquia clara**: Valores atuais em destaque, orçados em fonte suave
4. **Feedback visual**: Gerente vê imediatamente se está acima/abaixo do orçado

