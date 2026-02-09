
# Remover dados de orcamento da alocacao de equipe

## Objetivo
Simplificar a tabela de alocacao de equipe para exibir apenas **Planejado vs Realizado**, removendo todas as referencias ao orcamento (orcado).

## Mudancas no arquivo `src/components/projects/detail/ProjectLaborSection.tsx`

### O que sera removido:

1. **Coluna R$/h**: Remover a linha secundaria que mostra o valor/hora do orcamento (linhas 630-634)

2. **Colunas mensais**: Remover o texto auxiliar com as horas orcadas abaixo de cada celula mensal (linhas 703-707)

3. **Coluna Horas total**: Remover o texto auxiliar com total de horas orcadas (linhas 725-729)

4. **Coluna Custo total**: Remover o texto auxiliar com valor total orcado (linhas 745-749)

5. **Rodape - colunas mensais**: Remover as horas orcadas abaixo do total mensal (linhas 835-839, incluindo calculo nas linhas 814-818)

6. **Rodape - Horas total**: Remover referencia ao budgetSummary.hours (linhas 855-859)

7. **Rodape - Custo total**: Remover referencia ao budgetSummary.value (linhas 873-877)

8. **Rodape - Acao de variacao**: Remover o indicador de variacao percentual contra orcamento (linhas 882-904)

### Codigo que pode ser simplificado (limpeza):

Os seguintes calculos deixam de ser necessarios e podem ser removidos para manter o codigo limpo:
- `budgetSummary` (useMemo linhas 404-413)
- `budgetVariation` (useMemo linhas 416-421)
- `budgetDataByMember` (useMemo linhas 456-492) - parcialmente, apenas os campos de horas por mes e total

**Nota**: Os campos `budgetSeniority` e `budgetHourlyRate` dentro de `budgetDataByMember` ainda sao usados na coluna de Funcionario (exibe a senioridade do papel) e na coluna R$/h (quando nao ha funcionario atribuido, mostra "(orcado)"). Esses usos serao mantidos pois sao informativos sobre o papel, nao sobre comparacao orcamentaria.

### Resultado esperado
A tabela exibira apenas duas camadas de informacao:
- **Planejado**: horas e custos definidos pelo gestor do projeto
- **Realizado**: horas reais dos timesheets e custos calculados

Sem nenhuma referencia a valores vindos do orcamento original.
