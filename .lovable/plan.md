

# Simplificar celula de alocacao com tooltip

## Resumo

Remover os textos "Real." e "Plan." com horas que aparecem acima da barra de progresso na tabela de alocacao. Manter apenas a barra de progresso e os percentuais abaixo dela. Ao passar o mouse sobre a celula, exibir um tooltip com as informacoes detalhadas: horas realizadas, horas planejadas e capacidade total.

## Alteracoes

### `src/components/timesheets/AllocationOverview.tsx`

**Remover** as duas divs com "Real." e "Plan." que ficam acima da barra:
```text
// Remover estas linhas:
<div className="flex justify-between text-xs">
  <span className="text-muted-foreground">Real.</span>
  <span className="font-medium">{actual}h</span>
</div>
<div className="flex justify-between text-xs">
  <span className="text-muted-foreground">Plan.</span>
  <span className="font-medium">{planned}h / {emp.jornadaMensal}h</span>
</div>
```

**Adicionar** um `Tooltip` envolvendo o conteudo da celula com as informacoes detalhadas:

```text
<Tooltip>
  <TooltipTrigger asChild>
    <div className="space-y-1.5">
      (barra de progresso)
      (percentuais)
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <div className="text-xs space-y-1">
      <div>Realizado: {actual}h</div>
      <div>Planejado: {planned}h</div>
      <div>Capacidade: {emp.jornadaMensal}h</div>
    </div>
  </TooltipContent>
</Tooltip>
```

**Envolver** a `Table` com `TooltipProvider` para que os tooltips funcionem.

### Resultado visual

Celula do mes mostrara apenas:
```text
[===barra de progresso===]
95% aloc. · 28% real.
```

Ao passar o mouse:
```text
Realizado: 35h
Planejado: 126h
Capacidade: 132h
```

