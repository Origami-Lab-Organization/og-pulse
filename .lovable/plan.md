

## Plano: Lançamento de Comissão como Custo de Projeto

### Contexto
O orçamento já possui `commission_percent`, que gera um valor de comissão total calculado via markup. Essa comissão precisa ser rastreada como custo real do projeto, dividida proporcionalmente pelas parcelas, e marcada como paga conforme cada parcela é recebida.

### Modelo de Dados

Criar tabela `project_commissions` para rastrear comissão por parcela:

```text
project_commissions
├── id (uuid, PK)
├── project_id (uuid, FK → projects)
├── installment_id (uuid, FK → project_installments)
├── planned_value (numeric) — valor planejado da comissão para esta parcela
├── is_paid (boolean, default false)
├── paid_date (date, nullable)
├── paid_to (text, nullable) — nome de quem recebeu
├── notes (text, nullable)
└── created_at (timestamptz)
```

RLS: mesmas políticas tenant-based dos outros custos de projeto.

### Lógica de Cálculo

1. **Valor total da comissão** = `budget.commission_percent / 100 * budget.final_total` (ou selling_price, conforme fórmula do markup)
2. **Valor por parcela** = total comissão / número de parcelas do projeto
3. **Planejado**: soma de todos os `planned_value`
4. **Realizado**: soma dos `planned_value` onde `is_paid = true`

### Mudanças no Frontend

**`src/components/projects/detail/ProjectCostsTab.tsx`**
- Adicionar card "Comissão" no grid de KPIs (entre Reembolsos e Custo Total)
- Incluir comissão no cálculo de `totalPlanned` e `totalActual`
- Ajustar grid para 6 colunas (ou manter 5 com scroll)

**Nova seção `ProjectCommissionsSection`**
- Tabela mostrando cada parcela com: nº parcela, valor planejado, status da parcela (recebida?), comissão paga?, data pagamento
- Botão para marcar comissão como paga (disponível apenas quando a parcela correspondente tem status "received")
- Campo para registrar para quem foi pago e data

**`src/hooks/useProjectCommissions.ts`** (novo)
- Hook para buscar/criar/atualizar comissões do projeto
- Auto-geração dos registros de comissão quando o projeto tem orçamento vinculado

### Geração Automática
Quando o projeto é carregado e tem `budget_id` com `commission_percent > 0`:
- Verificar se já existem registros em `project_commissions`
- Se não, calcular e criar um registro por parcela com o `planned_value` proporcional

### Arquivos Alterados/Criados
1. **Migration SQL**: criar tabela `project_commissions` com RLS
2. **`src/hooks/useProjectCommissions.ts`**: novo hook CRUD
3. **`src/components/projects/detail/ProjectCommissionsSection.tsx`**: nova seção
4. **`src/components/projects/detail/ProjectCostsTab.tsx`**: integrar card + seção
5. **`src/types/project.ts`**: adicionar interfaces de comissão

