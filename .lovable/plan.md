

# Plano: Ajustes Visuais no Portfolio de Projetos

## Problemas Identificados

1. **Cores diferentes nas colunas**: Cada coluna tem uma cor distinta (slate, blue, purple, amber, teal, green), causando poluição visual
2. **Barra de scroll horizontal mal posicionada**: O ScrollArea está com altura calculada incorretamente (`min-h-[calc(100vh-220px)]`), deixando a barra de scroll acima do rodapé

## Alteracoes Propostas

### 1. Unificar Cores das Colunas

**Arquivo: `src/types/portfolio.ts`**

Alterar todas as colunas para usar a mesma cor neutra:

```typescript
// De:
{ id: 'planning', label: 'Planejamento', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
{ id: 'value_delivery', label: 'Entrega de Valor', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
// ... cada uma com cor diferente

// Para:
// Todas com a mesma cor neutra
{ id: 'planning', label: 'Planejamento', color: 'bg-muted text-foreground' },
{ id: 'value_delivery', label: 'Entrega de Valor', color: 'bg-muted text-foreground' },
{ id: 'results_presentation', label: 'Apresentacao de Resultados', color: 'bg-muted text-foreground' },
{ id: 'value_book', label: 'Value Book', color: 'bg-muted text-foreground' },
{ id: 'learning_case', label: 'Aprendizado e Case', color: 'bg-muted text-foreground' },
{ id: 'completed', label: 'Concluido', color: 'bg-muted text-foreground' },
```

### 2. Corrigir Posicao da Barra de Scroll

**Arquivo: `src/components/portfolio/PortfolioKanbanBoard.tsx`**

O problema esta na altura do container que usa `min-h-[calc(100vh-220px)]` - isso cria um espaco minimo que nao corresponde ao espaco disponivel real.

Ajustar para usar `h-full` no ScrollArea e remover a altura minima fixa das colunas:

```typescript
// De:
<ScrollArea className="w-full">
  <div className="flex gap-4 p-4 min-h-[calc(100vh-220px)]">

// Para:
<ScrollArea className="w-full h-full">
  <div className="flex gap-4 p-4 pb-6">
```

**Arquivo: `src/pages/Portfolio.tsx`**

Garantir que o container do Kanban ocupe todo o espaco disponivel:

```typescript
// De:
<div className="flex-1 overflow-hidden bg-muted/30">

// Para:
<div className="flex-1 overflow-auto bg-muted/30">
```

## Resultado Visual Esperado

```text
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Planejam. │ │Entrega   │ │Apresent. │ │Value Book│ │Aprendiz. │ │Concluido │
│    2     │ │    3     │ │    1     │ │    0     │ │    1     │ │    5     │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│ (cards)  │ │ (cards)  │ │ (cards)  │ │ (vazio)  │ │ (cards)  │ │ (cards)  │
└──────────┴─┴──────────┴─┴──────────┴─┴──────────┴─┴──────────┴─┴──────────┘
═══════════════════════════════════════════════════════════════════════════════
                        [Barra de Scroll Horizontal no Rodape]
```

Todas as colunas terao a mesma aparencia neutra (bg-muted) e a barra de scroll horizontal ficara posicionada no rodape da area do Kanban.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/portfolio.ts` | Unificar cores para bg-muted text-foreground |
| `src/components/portfolio/PortfolioKanbanBoard.tsx` | Ajustar altura do ScrollArea para h-full |
| `src/pages/Portfolio.tsx` | Mudar overflow-hidden para overflow-auto |

