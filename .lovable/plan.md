

## Corrigir query dos leads para restaurar os cartoes do CRM

### Problema
A query de busca dos leads usa o hint `leads_created_by_fkey` para fazer join com a tabela `employees`, mas essa foreign key **nao existe** no banco. Apenas estas FKs existem na tabela `leads`:
- `leads_budget_id_fkey` (budget_id -> budgets)
- `leads_client_id_fkey` (client_id -> clients)
- `leads_responsible_id_fkey` (responsible_id -> employees)
- `leads_tenant_id_fkey` (tenant_id -> tenants)

O campo `created_by` nao tem FK, entao o PostgREST retorna erro 400 e nenhum lead e carregado.

### Solucao

Duas opcoes para resolver:

**Opcao A (recomendada)**: Criar a foreign key que esta faltando no banco e manter o codigo como esta.

**Opcao B**: Remover o join `creator` da query, ja que agora temos o campo `responsible` que cumpre o mesmo papel.

Vou seguir a **Opcao A** - criar a FK faltante:

1. **Migracao no banco**: Criar FK `leads_created_by_fkey` ligando `created_by` a `employees(id)`
2. **Nenhuma alteracao de codigo necessaria** - a query ja esta correta, so faltava a FK

### Detalhes tecnicos

```sql
ALTER TABLE public.leads
  ADD CONSTRAINT leads_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id);
```

Apos essa migracao, a query voltara a funcionar e todos os 6 leads aparecao normalmente no quadro.
