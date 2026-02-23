

## Permitir Replanejamento de Equipe em Projetos em Andamento

### Problema

Atualmente, a secao de "Alocacao de Equipe" na aba Custos so permite edicao quando o projeto esta na fase de Planejamento (`portfolio_stage === 'planning'`). Uma vez que o projeto avanca para "Entrega de Valor" ou outros estagios, nao e possivel:

- Adicionar ou remover membros da equipe
- Replanejar as horas alocadas por mes
- Atribuir/desatribuir funcionarios aos papeis

As horas ja lancadas via timesheet continuam sendo apenas visualizadas (somente leitura), editaveis apenas na secao de Alocacao -- isso ja funciona assim e nao muda.

### Solucao

A alteracao e pontual: no componente `ProjectCostsTab`, o prop `isEditable` passado ao `ProjectLaborSection` sera expandido para incluir tambem o estagio de execucao.

### Alteracoes

**Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`**

Alterar a linha que passa `isEditable` ao `ProjectLaborSection` (linha 352):

De:
```
isEditable={isEditable}
```

Para:
```
isEditable={isEditable || canEditActuals}
```

Isso faz com que, em qualquer estagio que nao seja "Concluido" (e desde que o usuario tenha permissao), ele possa:
- Adicionar novos papeis/membros
- Remover membros
- Editar horas planejadas por mes
- Atribuir/desatribuir funcionarios

As horas reais (timesheets) continuam sendo apenas exibidas na tabela, sem possibilidade de edicao nesta tela.

### Resumo

| Cenario | Antes | Depois |
|---|---|---|
| Projeto em Planejamento | Pode editar equipe | Pode editar equipe (sem mudanca) |
| Projeto em Entrega de Valor | Equipe somente leitura | Pode editar equipe |
| Projeto Concluido (admin) | Equipe somente leitura | Equipe somente leitura (sem mudanca) |
| Horas de timesheet | Somente leitura | Somente leitura (sem mudanca) |

