

## Plano: Gerar comissões para projetos ativos existentes

### Problema
A auto-geração de comissões só acontece quando alguém abre a aba de Custos de um projeto. Projetos ativos que já têm orçamento com `commission_percent > 0` ainda não possuem registros em `project_commissions`.

### Solução
Executar um script SQL (via migration de dados) que:
1. Identifica todos os projetos com `budget_id` vinculado a um orçamento com `commission_percent > 0`
2. Que ainda **não** possuem registros em `project_commissions`
3. Para cada projeto, calcula `(commission_percent / 100) * final_total` e divide igualmente pelas parcelas existentes em `project_installments`
4. Insere os registros de comissão

### SQL a executar

```sql
INSERT INTO project_commissions (project_id, installment_id, planned_value)
SELECT 
  pi.project_id,
  pi.id AS installment_id,
  ROUND((b.commission_percent / 100.0 * b.final_total) / inst_count.cnt, 2) AS planned_value
FROM project_installments pi
JOIN projects p ON p.id = pi.project_id
JOIN budgets b ON b.id = p.budget_id
JOIN (
  SELECT project_id, COUNT(*) AS cnt 
  FROM project_installments 
  GROUP BY project_id
) inst_count ON inst_count.project_id = p.id
WHERE b.commission_percent > 0
  AND NOT EXISTS (
    SELECT 1 FROM project_commissions pc WHERE pc.project_id = p.id
  );
```

### Mudanças
1. **Migration SQL**: Executar o INSERT acima para popular `project_commissions` para todos os projetos existentes que se qualificam.

Nenhuma mudança de código e necessária -- a lógica de exibição e gestão das comissões já existe no frontend.

### Arquivos alterados
- Nenhum arquivo de código (apenas execução de migration SQL)

