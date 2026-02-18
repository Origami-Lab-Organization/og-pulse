

# Atualizar Cores dos Status de Projeto (Portfolio Stage)

## Resumo

Trocar o campo exibido de `project.status` para `project.portfolio_stage` em todos os pontos visuais, e aplicar o novo esquema de cores: cinza para Planejamento, azul para os estagios intermediarios (Entrega de Valor ate Aprendizado e Case), e verde para Concluido.

## Novo Mapa de Cores

| Estagio | Cor |
|---------|-----|
| planning (Planejamento) | Cinza |
| value_delivery (Entrega de Valor) | Azul |
| results_presentation (Apresentacao de Resultados) | Azul |
| value_book (Value Book) | Azul |
| learning_case (Aprendizado e Case) | Azul |
| completed (Concluido) | Verde |

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/projects/detail/ProjectHeader.tsx` | Trocar `project.status` por `project.portfolio_stage`, importar `PORTFOLIO_STAGE_LABELS`, aplicar novas cores |
| `src/components/projects/ProjectsTable.tsx` | Trocar coluna status para usar `portfolio_stage`, importar `PORTFOLIO_STAGE_LABELS`, aplicar novas cores |
| `src/components/projects/ProjectDetailDialog.tsx` | Trocar badge de status para usar `portfolio_stage`, importar `PORTFOLIO_STAGE_LABELS`, aplicar novas cores |

## Detalhes Tecnicos

O mesmo mapa de cores sera usado nos 3 arquivos, substituindo o `statusColors` atual:

```typescript
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';

const stageColors: Record<PortfolioStage, string> = {
  planning: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  value_delivery: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  results_presentation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  value_book: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  learning_case: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};
```

Em cada arquivo, as referencias `project.status` e `PROJECT_STATUS_LABELS` serao substituidas por `project.portfolio_stage` e `PORTFOLIO_STAGE_LABELS`.

