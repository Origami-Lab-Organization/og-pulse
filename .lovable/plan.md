
# Plano: Reorganizar Layout e Remover Observações

## Alterações Solicitadas

1. **Mover Resumo Financeiro** para logo após Cliente/Lead e Validade
2. **Remover seção Observações** completamente da exibição

## Estrutura Atual (linhas relevantes)

| Seção | Linhas |
|-------|--------|
| Cards de Status | 114-158 |
| Cliente/Lead e Validade | 160-210 |
| Gráficos | 212-216 |
| Alocação de Papéis | 218-267 |
| Fornecedores | 269-311 |
| Materiais | 313-349 |
| Resumo Financeiro | 351-418 |
| Histórico de Versões | 420-421 |
| Observações | 423-432 |

## Nova Estrutura

```text
1. Cards de Status (mantém)
2. Cliente/Lead e Validade (mantém)
3. Resumo Financeiro ← MOVIDO PARA CÁ
4. Gráficos
5. Alocação de Papéis
6. Fornecedores
7. Materiais
8. Histórico de Versões (última seção de dados)
-- Observações REMOVIDA --
```

## Alterações Técnicas em `src/pages/BudgetDetail.tsx`

### 1. Mover bloco "Resumo Financeiro"
- **De**: linhas 351-418
- **Para**: após linha 210 (depois do card de Validade)

### 2. Remover bloco "Observações"
- **Excluir**: linhas 423-432 (bloco condicional `{budget.notes && ...}`)

## Visualização Final

```text
┌────────────────────────────────────────────────────────────┐
│ Cards: Status | Duração | Total de Horas | Valor Final     │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ Cliente/Lead        │  │ Validade            │           │
│ └─────────────────────┘  └─────────────────────┘           │
├────────────────────────────────────────────────────────────┤
│ 📈 Resumo Financeiro                                       │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ Gráfico: Horas/Mês  │  │ Gráfico: Composição │           │
│ └─────────────────────┘  └─────────────────────┘           │
├────────────────────────────────────────────────────────────┤
│ 📋 Alocação de Papéis                                      │
├────────────────────────────────────────────────────────────┤
│ 🚚 Fornecedores (se houver)                                │
├────────────────────────────────────────────────────────────┤
│ 📦 Materiais (se houver)                                   │
├────────────────────────────────────────────────────────────┤
│ 📜 Histórico de Versões                                    │
└────────────────────────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/BudgetDetail.tsx` | Mover Resumo Financeiro (linhas 351-418) para após linha 210; Remover Observações (linhas 423-432) |
