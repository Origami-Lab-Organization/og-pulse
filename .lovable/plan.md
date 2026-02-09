
# Corrigir lancamento de custos reais e melhorar gestao de fornecedores em execucao

## Problemas Identificados

### 1. Bug: Valor realizado nao esta sendo salvo
O dialog de lancamento de custo real (`SupplierActualDialog`) possui um bug que impede o salvamento:
- Na linha 49, o array `months` e recriado em cada render
- Este array esta na lista de dependencias do `useEffect` da linha 52-69
- Isso causa um loop: cada vez que o usuario digita um valor, o `useEffect` dispara novamente e reseta o valor para `0`

### 2. UX: Gestao de fornecedores em execucao
Atualmente, projetos em andamento mostram os valores planejados como somente leitura (Plan | Real). O usuario quer poder adicionar novos fornecedores e editar valores planejados tambem durante a execucao, usando a mesma logica inline do planejamento.

## Plano de Mudancas

| Arquivo | Acao |
|---------|------|
| `src/components/projects/detail/SupplierActualDialog.tsx` | Corrigir bug do loop infinito de re-render |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Permitir edicao inline de planejado tambem em modo execucao |

### Detalhes Tecnicos

**SupplierActualDialog.tsx - Correcao do bug**
- Memoizar o array `months` com `useMemo` para evitar recriacao a cada render
- Remover `months` da dependencia do primeiro `useEffect` (usar `durationMonths` no lugar)
- Isso impede que o `useEffect` resete o valor digitado pelo usuario

**ProjectSuppliersSection.tsx - Edicao inline em execucao**
- Na coluna mensal, quando `canEditActuals` e `true` e o fornecedor esta em modo de edicao (`editingRowId`), exibir inputs para valores planejados (mesma logica do modo planejamento)
- Quando nao esta editando, manter a visualizacao dual "Plan | Real"
- Manter o botao de "$" para lançar o custo realizado via dialog
- Habilitar os botoes de Editar (lapis) e Excluir para fornecedores existentes no modo execucao
- Manter o botao "Adicionar Fornecedor" ja existente (que ja funciona em execucao)

Isso unifica a experiencia: o usuario pode gerenciar fornecedores (adicionar, editar planejado, excluir) em ambas as fases, e lançar o realizado via dialog apenas na execucao.
