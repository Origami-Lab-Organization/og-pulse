

# Plano: Corrigir Rodape Fixo para Nao Sobrepor Menu Lateral

## Problema Identificado

O rodape fixo com os botoes de navegacao esta usando `left-0`, fazendo com que ele comece da borda esquerda da tela e sobreponha o menu lateral (sidebar).

### Codigo Atual (linha 638 do BudgetForm.tsx)

```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur ...">
```

## Analise da Estrutura

A sidebar usa CSS custom properties:
- `--sidebar-width: 16rem` (256px) quando expandida
- `--sidebar-width-icon: 3rem` (48px) quando colapsada

O componente `SidebarInset` eh onde o conteudo principal eh renderizado, e ele fica ao lado da sidebar automaticamente. Entretanto, elementos `fixed` saem do fluxo do documento e nao respeitam essa estrutura.

## Solucao

Em vez de usar `fixed`, a melhor abordagem eh usar `sticky` no rodape, que mantém o elemento posicionado na parte inferior da tela mas dentro do fluxo do container pai (que ja respeita a sidebar).

### Mudanca 1 - Alterar estrutura do layout do formulário

Envolver o conteúdo em uma estrutura flex que permita o footer sticky funcionar corretamente:

```tsx
{/* Wizard content */}
<div className="flex flex-col min-h-[calc(100vh-200px)]">
  {/* Current step content */}
  <div className="flex-1 mt-6">
    {renderStepContent(currentStep)}
  </div>

  {/* Wizard navigation - sticky footer */}
  <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 -mx-6 mt-6">
    ...
  </div>
</div>
```

A abordagem com `sticky` eh preferivel porque:
1. O elemento fica dentro do fluxo do documento
2. Respeita automaticamente os limites do container pai
3. Nao precisa de calculo de largura da sidebar
4. Funciona corretamente quando a sidebar esta expandida ou colapsada

### Mudanca 2 - Remover padding bottom extra

Como o sticky esta dentro do fluxo, nao precisamos mais do `pb-24`:

```tsx
// De:
<div className="mt-6 pb-24">

// Para:
<div className="flex-1 mt-6">
```

## Resumo das Alteracoes

| Local | De | Para |
|-------|-----|------|
| Linha 637-638 | `<div className="mt-6 pb-24">` | `<div className="flex flex-col min-h-[calc(100vh-200px)]"><div className="flex-1 mt-6">` |
| Linha 642 | `fixed bottom-0 left-0 right-0 z-50` | `sticky bottom-0 z-40 -mx-6 mt-6` |
| Apos conteudo | - | Fechar div wrapper |

## Arquivo a Modificar

- `src/pages/BudgetForm.tsx`

