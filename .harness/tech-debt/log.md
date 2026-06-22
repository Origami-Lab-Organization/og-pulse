# Log de Divida Tecnica

## Aberto

- Preencher discovery completo do Harness com time, cliente, compliance e restricoes reais.
- Revisar migrations Supabase antigas para identificar decisoes arquiteturais que merecem ADR.
- Confirmar padrao oficial de lock/aprovacao de timesheets e documentar em pattern dedicado se necessario.

### TD-0001 — `as any` em Edge Functions de alertas de parcelas
- **Status:** aberto
- **Prioridade:** baixa
- **Arquivo:** `supabase/functions/notify-installment-alerts/index.ts`
- **Impacto:** Deno não tem inferência automática das respostas do Supabase JS SDK; os casts `as any` existem nos campos `installment_number`, `value`, `invoice_date` e `projects` dos registros retornados pela query. Sem risco funcional imediato — mas reduz segurança de tipos e pode mascarar erros de schema no futuro.
- **Próximo passo:** Criar interfaces tipadas para as rows de `project_installments` + `projects` no contexto Deno (ou extrair um tipo compartilhado via `supabase gen types`), removendo os casts.

## Resolvido

- Nenhum item registrado ainda.
