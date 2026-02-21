

# Toggle de secoes e cores de alocacao na Minha Timesheet

## Resumo

Duas mudancas na pagina "Minha Timesheet":

1. **Toggle entre secoes**: Substituir a exibicao empilhada (alocacao + lancamento) por um toggle com duas opcoes: "Minha Alocacao" e "Lancar Horas". Apenas uma secao visivel por vez, eliminando scroll excessivo.

2. **Cores da barra de progresso**: Adotar o mesmo padrao visual da tela de Alocacao do gerente: verde escuro para horas realizadas, verde claro para horas planejadas restantes, cinza para capacidade livre.

## Alteracoes

### `src/pages/MyTimesheet.tsx`

- Adicionar estado `activeSection` com valores `"allocation"` e `"timesheet"` (default: `"timesheet"`)
- Adicionar um `ToggleGroup` (single select) acima do conteudo, com dois botoes: "Minha Alocacao" e "Lancar Horas"
- Renderizar condicionalmente `MyTimesheetAllocation` ou a lista de cards de projeto conforme a secao ativa

### `src/components/timesheets/MyTimesheetAllocation.tsx`

- Remover o `Collapsible` (nao precisa mais, ja que a secao inteira e controlada pelo toggle)
- Substituir a barra `Progress` do resumo geral por uma barra segmentada com 3 cores:
  - **Verde escuro** (`bg-green-700`): percentual realizado sobre capacidade
  - **Verde claro** (`bg-green-300`): percentual planejado restante (planejado - realizado) sobre capacidade
  - **Cinza** (`bg-muted`): fundo representando capacidade livre
- Substituir as barras por projeto para usar o mesmo padrao de 3 cores (verde escuro + verde claro + cinza)
- Manter tooltip com hover mostrando horas detalhadas

### Resultado visual

**Toggle no topo:**
```text
[ Minha Alocacao ]  [ Lancar Horas ]
```

**Barra de progresso (padrao verde):**
```text
[==verde escuro==|==verde claro==|-------cinza-------]
   realizado        plan. restante     livre
```

