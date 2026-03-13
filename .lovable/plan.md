

## Diagnóstico

Encontrei **dois bugs** causando o problema:

### Bug 1 — ProjectStats: `project_id` ausente nas parcelas

A query `getAll` seleciona parcelas SEM o campo `project_id`:
```
installments:project_installments(id, installment_number, value, due_date, status, ...)
```

O array `allInstallments = projects.flatMap(p => p.installments)` produz objetos sem `project_id`. Na hora de separar parcelas de projetos contínuos vs fixos, `continuousProjectIds.has(i.project_id)` sempre retorna `false` (porque `project_id` é `undefined`). Resultado: a lógica de separação contínuo/fixo não funciona, e dependendo do caso pode duplicar ou omitir valores.

### Bug 2 — PortfolioCard: mostra valor mensal em vez de anual

O card exibe `project.total_value` diretamente (R$5.000, o valor mensal), quando deveria mostrar a projeção anual (R$60.000 para 12 meses).

---

## Plano de Correção

### 1. `src/components/projects/ProjectStats.tsx`
Reescrever o cálculo de receita anual para iterar sobre `projects` em vez de usar o array flat de installments (que não tem `project_id`):

- Para cada projeto, acessar `p.installments` (que está correto por projeto)
- Projetos contínuos (exceto `financiamento_inovacao`): usar `Math.max(projeção, soma das parcelas do ano)`
- Projetos não-contínuos: somar parcelas do ano
- Somar tudo para o total

O cálculo de "Recebido" e "Atrasado" também passará a usar `projects.flatMap` com valor correto (sem depender de `project_id`).

### 2. `src/components/portfolio/PortfolioCard.tsx`
Para projetos contínuos, calcular o valor anual projetado no ano corrente baseado nos meses ativos (mesma lógica de start_date/renewal_date), em vez de exibir `total_value` diretamente.

### 3. `src/services/projectService.ts` (opcional, recomendado)
Adicionar `project_id` ao select de installments no `getAll` para evitar bugs futuros:
```
installments:project_installments(id, project_id, installment_number, value, due_date, status, invoice_number, payment_date)
```

