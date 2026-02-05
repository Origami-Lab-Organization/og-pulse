

# Plano: Melhorias de UX na Tela de Alocação de Equipe

## Análise do Problema

Analisando a imagem fornecida como especialista UX com 15 anos de experiência, identifiquei dois problemas principais:

### Problema 1: Dropdown de Funcionário Visualmente Confuso

O dropdown atual exibe as informações do funcionário em formato empilhado (nome em cima, cargo + valor/hora embaixo), mas dentro de uma célula de tabela estreita isso resulta em:

- **Informações "emboladas"**: Nome, cargo e valor/hora ficam amontoados
- **Falta de hierarquia visual**: Não fica claro qual é a informação principal
- **Comparação difícil**: O gerente precisa comparar custos entre funcionários rapidamente

### Problema 2: Falta de Visão do Orçamento vs Planejado

O gerente não consegue visualizar facilmente:
- **O que foi orçado**: Qual era a expectativa do orçamento original?
- **O que está planejando**: Como o planejamento atual se compara ao orçado?
- **Variações**: Está acima ou abaixo do esperado?

---

## Soluções Propostas

### Solução 1: Melhorar a Coluna de Funcionário

**Abordagem: Separar a seleção do display**

Em vez de exibir todas as informações no trigger do Select, usaremos:

1. **Trigger limpo**: Exibir apenas o nome do funcionário (ou "Selecionar..." se vazio)
2. **Custo separado na tabela**: Mover o custo real para a coluna dedicada "Custo R$/h" (já existe)
3. **Dropdown rico**: Dentro do dropdown, exibir informações completas em layout horizontal:

```
┌─────────────────────────────────────────────────┐
│ Victor Couto          CEO        R$ 119,05/h    │
├─────────────────────────────────────────────────┤
│ Italo Cesar Castro    Tech Lead  R$ 59,52/h    │
├─────────────────────────────────────────────────┤
│ Maria Silva           Designer   R$ 45,00/h    │
└─────────────────────────────────────────────────┘
```

**Benefícios:**
- Trigger do Select fica limpo e legível
- Dropdown mostra informações lado a lado (mais fácil comparar)
- Custo real fica na coluna dedicada da tabela

### Solução 2: Adicionar Resumo Visual do Orçamento

**Abordagem: Card de comparação no topo da seção**

Adicionar um pequeno card de resumo que exiba:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Comparativo com Orçamento                                   │
│                                                                 │
│  Orçado: 420h • R$ 31.500,00    Planejado: 420h • R$ 29.840,00 │
│                                                                 │
│  [████████████████░░] -5,3% abaixo do orçado ✓                 │
└─────────────────────────────────────────────────────────────────┘
```

**Informações exibidas:**
- Total de horas orçadas vs planejadas
- Valor total orçado vs custo planejado
- Indicador visual (verde se abaixo, amarelo se próximo, vermelho se acima)

**Benefícios:**
- Visão imediata do impacto das decisões de alocação
- Feedback em tempo real ao trocar funcionários
- Ajuda na tomada de decisão do gerente

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Refatorar o Select de Funcionário

**Antes:**
```tsx
<SelectItem key={emp.id} value={emp.id}>
  <div className="flex flex-col">
    <span className="font-medium">{emp.nome}</span>
    <span className="text-xs text-muted-foreground">
      {emp.cargo} • {formatCurrency(hourlyCost)}/h
    </span>
  </div>
</SelectItem>
```

**Depois:**
```tsx
<SelectTrigger className="w-full">
  <SelectValue placeholder="Selecionar...">
    {member.employee?.nome || 'Selecionar...'}
  </SelectValue>
</SelectTrigger>
<SelectContent className="min-w-[320px]">
  <SelectItem value="none">
    <span className="text-muted-foreground italic">Sem funcionário</span>
  </SelectItem>
  {availableEmployees.map((emp) => (
    <SelectItem key={emp.id} value={emp.id} className="py-2">
      <div className="flex items-center justify-between w-full gap-4">
        <span className="font-medium truncate">{emp.nome}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {emp.cargo}
        </span>
        <span className="text-xs font-medium text-primary whitespace-nowrap">
          {formatCurrency(hourlyCost)}/h
        </span>
      </div>
    </SelectItem>
  ))}
</SelectContent>
```

#### 2. Adicionar Card de Comparação com Orçamento

Criar um card simples no topo que calcula e exibe:
- Totais do orçamento original (budgetRoles)
- Totais do planejamento atual (members)
- Percentual de variação

```tsx
// Cálculo do resumo do orçamento
const budgetSummary = useMemo(() => {
  let budgetHours = 0;
  let budgetValue = 0;
  budgetRoles.forEach(role => {
    const hours = role.months?.reduce((sum, m) => sum + m.hours, 0) || 0;
    budgetHours += hours;
    budgetValue += hours * role.hourly_rate;
  });
  return { hours: budgetHours, value: budgetValue };
}, [budgetRoles]);

// Exibição do card de comparação
{budgetRoles.length > 0 && (
  <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Orçado</p>
        <p className="font-semibold">{budgetSummary.hours}h • {formatCurrency(budgetSummary.value)}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Planejado</p>
        <p className="font-semibold">{totals.totalHours}h • {formatCurrency(totals.totalValue)}</p>
      </div>
      <div className={cn("px-3 py-1 rounded-full text-sm font-medium", variationClass)}>
        {variationPercent}% {variationPercent < 0 ? 'abaixo' : 'acima'}
      </div>
    </div>
  </div>
)}
```

---

## Resumo das Alterações

| Alteração | Benefício UX |
|-----------|--------------|
| Trigger do Select mostra apenas nome | Célula limpa e legível |
| Dropdown com layout horizontal | Fácil comparar funcionários |
| Largura mínima no dropdown (320px) | Informações não ficam cortadas |
| Card de comparação orçado/planejado | Visão imediata do impacto financeiro |
| Indicador visual de variação | Feedback instantâneo (verde/amarelo/vermelho) |

---

## Resultado Esperado

1. **Célula de funcionário**: Exibe apenas o nome, mantendo a tabela limpa
2. **Dropdown de seleção**: Layout horizontal com nome, cargo e custo lado a lado para fácil comparação
3. **Resumo visual**: Card no topo mostrando orçado vs planejado com indicador colorido
4. **Tomada de decisão**: Gerente consegue ver imediatamente o impacto de suas escolhas de alocação

