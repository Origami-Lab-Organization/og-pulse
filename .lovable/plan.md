

# Plano: Melhorias na UX de Planejamento de Custos de Mão de Obra

## Problemas Identificados

1. **Exibição dos Papéis do Orçamento**: Os papéis aparecem apenas como badges de referência no topo, dificultando a visualização do que foi orçado enquanto o gerente planeja a alocação
2. **Colunas "Plan | Real" durante planejamento**: Durante a fase de planejamento, não faz sentido exibir "Planejado vs Realizado" pois ainda não há execução - isso confunde o usuário
3. **Layout dos botões "Salvar/Editar Horas" e "Adicionar Membro"**: Os botões ficaram visualmente ruins lado a lado, precisam de melhor organização

---

## Solução Proposta

### 1. Seção de Referência do Orçamento Expandida

Transformar a seção de referência do orçamento em uma visualização mais útil:
- Mostrar uma **tabela resumida** com os papéis orçados, incluindo horas por mês e total
- Exibir o **status de alocação** de cada papel (quantas pessoas já foram alocadas para aquele papel)
- Usar visual de card com destaque para facilitar consulta enquanto planeja

### 2. Simplificar Interface de Planejamento

Durante a fase de planejamento (quando `isEditable` é true e não há horas reais):
- **Remover as colunas "Plan | Real"** dos cabeçalhos mensais
- Exibir apenas **uma coluna de horas** por mês (as horas planejadas)
- Remover as colunas de totais "Plan | Real" (mostrar apenas o total planejado)
- Detectar se o projeto está em fase de planejamento baseado na existência de horas reais

### 3. Reorganizar Layout dos Botões

Separar as ações em duas linhas ou grupos lógicos:
- **Linha 1 (CardHeader)**: Apenas o botão "Adicionar Membro"
- **Linha 2 (abaixo da tabela ou como toolbar)**: Botões "Editar Horas" / "Salvar Horas" quando houver membros

Ou usar um layout com grupos visuais:
```
[Título e descrição]                    [+ Adicionar Membro]
                                        
[Tabela...]

[Footer com: Editar Horas / Salvar Horas]
```

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Detectar se está em modo de planejamento (sem horas reais)
```typescript
const isInPlanningMode = useMemo(() => {
  // Se o total de horas reais for 0, estamos em planejamento
  return totals.totalActualHours === 0;
}, [totals.totalActualHours]);
```

#### 2. Simplificar cabeçalhos mensais durante planejamento
Remover o subtítulo "Plan | Real" e mostrar apenas "Mês X":
```tsx
<TableHead key={m} className="text-center min-w-[90px]">
  <span>Mês {m}</span>
  {!isInPlanningMode && (
    <span className="text-xs font-normal text-muted-foreground block">Plan | Real</span>
  )}
</TableHead>
```

#### 3. Simplificar células de horas durante planejamento
Mostrar apenas as horas planejadas (editáveis ou não):
```tsx
{isInPlanningMode ? (
  // Modo planejamento: apenas horas planejadas
  hoursEditMode ? (
    <Input ... />
  ) : (
    <span>{plannedHours > 0 ? plannedHours : '-'}</span>
  )
) : (
  // Modo execução: Plan | Real
  <div className="flex items-center justify-center gap-1">
    <span>{plannedHours}</span> | <span>{actualHours}</span>
  </div>
)}
```

#### 4. Simplificar colunas de totais durante planejamento
Mostrar apenas "Horas" e "Custo" sem o subtítulo "Plan | Real":
```tsx
<TableHead className="text-center">
  <span>Horas</span>
  {!isInPlanningMode && (
    <span className="text-xs block">Plan | Real</span>
  )}
</TableHead>
```

#### 5. Reorganizar os botões
Mover o botão de edição/salvamento para um CardFooter:
```tsx
<Card>
  <CardHeader>
    <div>
      <CardTitle>...</CardTitle>
      <CardDescription>...</CardDescription>
    </div>
    {isEditable && (
      <Button onClick={() => setDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Membro
      </Button>
    )}
  </CardHeader>
  
  <CardContent>
    {/* Tabela */}
  </CardContent>
  
  {isEditable && members.length > 0 && (
    <CardFooter className="justify-end border-t pt-4">
      {hoursEditMode ? (
        <Button onClick={handleSaveHours}>
          <Check className="mr-2 h-4 w-4" />
          Salvar Horas
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setHoursEditMode(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar Horas
        </Button>
      )}
    </CardFooter>
  )}
</Card>
```

#### 6. Melhorar seção de referência do orçamento
Adicionar indicador de quantos membros foram alocados para cada papel:
```tsx
{budgetRolesSummary.map((role) => {
  const allocatedCount = members.filter(m => m.budget_role_id === role.id).length;
  return (
    <Badge key={role.id} variant={allocatedCount > 0 ? "default" : "secondary"}>
      {role.role_name} ({role.seniority}) • {formatCurrency(role.hourly_rate)}/h • {role.totalHours}h
      {allocatedCount > 0 && (
        <span className="ml-2 text-xs">({allocatedCount} alocado(s))</span>
      )}
    </Badge>
  );
})}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectLaborSection.tsx` | Detectar modo planejamento, simplificar UI sem "Plan/Real", reorganizar botões para CardFooter, melhorar referência do orçamento |

---

## Resultado Esperado

- Durante o planejamento, interface limpa mostrando apenas as horas a planejar
- Botões organizados: "Adicionar Membro" no topo, "Editar/Salvar Horas" no rodapé do card
- Papéis do orçamento mostram quantos membros já foram alocados
- Quando o projeto entrar em execução (horas reais > 0), automaticamente exibe "Plan | Real"

