
# Correcao: Receita do Ano mostrando valor incorreto

## Problema

O card "Receita no Ano" na pagina `/projects` esta mostrando R$60.000 quando deveria mostrar ~R$332.812.

**Causa raiz:** A query `projectService.getAll()` nao inclui `project_installments` no `select`. Portanto, `project.installments` e sempre `undefined` na listagem. O calculo atual:

1. Soma parcelas do ano corrente: **R$0** (pois nao ha parcelas carregadas)
2. Para projetos continuos sem parcelas no ano, soma `total_value x 12`: "Gestao de Portfolio" = R$5.000 x 12 = **R$60.000**
3. Prumo Obras (~R$327.812 em parcelas 2026) e completamente ignorado

## Solucao

Incluir `project_installments` no `select` da query `getAll` do `projectService`, seguindo o mesmo padrao ja usado no `getById`.

## Mudancas

### Arquivo: `src/services/projectService.ts`

Alterar a query `getAll` para incluir a relacao com `project_installments`:

```sql
-- De:
*, client:clients(...), manager:employees!(...)

-- Para:
*, client:clients(...), manager:employees!(...),
installments:project_installments(id, installment_number, value, due_date, status, invoice_number, payment_date)
```

Isso fara com que cada projeto na listagem ja venha com suas parcelas, permitindo que o `ProjectStats` calcule corretamente:
- Parcelas com vencimento em 2026 serao somadas (~R$327.812 do Prumo + R$5.000 do Gestao)
- Projetos continuos sem parcelas no ano usarao o fallback `total_value x 12`

### Apenas 1 arquivo editado

| Arquivo | Acao |
|---------|------|
| `src/services/projectService.ts` | Editar query `getAll` para incluir `installments:project_installments(...)` |
