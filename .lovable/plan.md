
# Plano: Corrigir Custos e Tabela de Parcelas na Aba Financeiro

## 1. Corrigir Custo Planejado (ProjectExpectedResultTab.tsx)

O calculo atual pula membros sem funcionario atribuido (`if (!employee) return`). A aba de Custos usa um fallback com `hourly_rate` do membro. Vamos alinhar.

**Mudanca no bloco de calculo (linhas 26-50):**
- Remover o `if (!employee) return`
- Quando nao houver `employee`, usar `member.hourly_rate` como custo/hora (mesmo padrao da aba Custos)

```typescript
project.members?.forEach((member) => {
  let hourlyCost = 0;
  if (member.employee) {
    const totalMonthlyCost = member.employee.total_monthly_cost_estimated || 0;
    const workHours = member.employee.jornada_mensal || 168;
    hourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;
  } else {
    hourlyCost = Number((member as any).hourly_rate) || 0;
  }
  // ... soma horas planejadas normalmente
});
```

## 2. Reorganizar Tabela de Parcelas (PlanningInstallmentsTable.tsx)

Colunas atuais: Parcela, Valor, Vencimento, Emissao NF, Data Pagamento, Acoes

Novas colunas: **Parcela, Valor, Emissao NF, Vencimento NF, Acoes**

- Remover coluna "Data Pagamento"
- Reordenar: Emissao NF antes de Vencimento NF
- **Vencimento NF** (`due_date`): somente leitura, vem da criacao do projeto no fechamento do negocio
- **Emissao NF** (`invoice_date`): editavel, pre-preenchido com `due_date` como sugestao (cor atenuada)
- Estado de edicao simplificado: apenas `invoiceDate`
- `saveEdit` envia apenas `invoiceDate`

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectExpectedResultTab.tsx` | Incluir fallback `hourly_rate` para membros sem funcionario |
| `src/components/projects/detail/PlanningInstallmentsTable.tsx` | Remover coluna Data Pagamento; reordenar colunas; simplificar edicao |
