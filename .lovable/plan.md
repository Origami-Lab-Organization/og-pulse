

# Simplificar Visao Geral do Projeto em Andamento

## Objetivo
Reestruturar a aba "Visao Geral" para projetos em andamento, mantendo apenas tres secoes: informacoes do projeto, KPIs comparativos e equipe.

## Layout Final

```text
+-------------------------------+  +-------------------------------+
| Informacoes do Projeto        |  | Informacoes Financeiras       |
| Cliente, Gerente, Periodo,    |  | Valor Contrato, Forma Pgto,   |
| Descricao                     |  | Parcelas, Dia Vencimento      |
+-------------------------------+  +-------------------------------+

+-------------------+  +-------------------+  +-------------------+
| Receita           |  | Custos            |  | Margem            |
| R$ xxx Realizado  |  | R$ xxx Realizado  |  | xx.x%  Realizado  |
| R$ xxx Planejado  |  | R$ xxx Planejado  |  | xx.x%  Planejado  |
| +x.x% variacao   |  | +x.x% variacao    |  | -x.xpp variacao   |
+-------------------+  +-------------------+  +-------------------+

+-------------------------------------------------------+
| Equipe do Projeto                                     |
+-------------------------------------------------------+
```

## O que muda

- **Adicionar**: Cards de "Informacoes do Projeto" e "Informacoes Financeiras" (reutilizar exatamente o layout da aba de planejamento, com icones e estrutura identicos)
- **Manter**: Os 3 cards de KPI (Receita, Custos, Margem) com planejado vs realizado
- **Manter**: Secao de Equipe (ProjectTeamSection)
- **Remover**: Cards de Saude do Projeto, OKRs, Cronograma, Custos detalhados e Faturamento

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Remover secoes de saude/OKR/cronograma/custos/faturamento e adicionar cards de informacoes do projeto e financeiras no topo |

## Detalhes tecnicos

- Importar `format` de `date-fns`, `ptBR`, icones adicionais (`Building2`, `User`, `CreditCard`, `FileText`) e `PAYMENT_METHOD_OPTIONS`
- Remover imports e hooks nao mais necessarios: `useProjectOKRs`, `useProjectMilestones`, `OKR_STATUS_LABELS`, `CONFIDENCE_LEVEL_LABELS`, `CONFIDENCE_LEVEL_COLORS`, `MILESTONE_STATUS_LABELS`, e as funcoes auxiliares `HealthIcon`, `HealthBadge`
- Manter os hooks de custos (`useProjectMemberMonths`, `useTimesheetsByMembers`, `useProjectSupplierMonths`, `useProjectSupplierActuals`) pois alimentam os KPIs
- Manter os `useMemo` de `metrics`, `costData` e `kpiData`; remover `health`, `scheduleSummary`, `okrSummary`, `financialSummary`
- O componente `CostRow` auxiliar tambem sera removido

