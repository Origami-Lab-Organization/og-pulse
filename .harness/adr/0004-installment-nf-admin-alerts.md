# ADR 0004: Alertas de emissão de NF para GPs e admins

- Status: aceito
- Data: 2026-06-22
- Decisores: Origami Lab / operação interna

## Contexto

A função `notify-installment-alerts` já existia e já notificava o `manager_id` do projeto no dia do `invoice_date`. Dois problemas foram identificados:

1. **Admins não recebiam o alerta** — apenas o gerente do projeto era notificado, deixando os admins sem visibilidade sobre emissões iminentes.
2. **Sem antecipação** — o alerta chegava apenas no dia da emissão, sem tempo hábil para preparação.
3. **Sem agendamento automático** — a função precisava ser chamada manualmente ou por scheduler externo não documentado.

## Decisão

- **Admins** (employees com `system_role = 'admin'` e `status = 'ativo'` no tenant) passam a receber os alertas de emissão de NF junto com o GP do projeto.
- **Antecipação de 3 dias**: novo tipo `installment_nf_alert_3d` disparado quando `invoice_date = hoje + 3`. O tipo `installment_nf_alert` (no dia) é mantido.
- **Deduplicação por recipient + tipo + reference_id + dia** garante que cada pessoa recebe no máximo um alerta por tipo por dia por parcela.
- **pg_cron** agenda a função diariamente às 08:00 UTC via migration versionada. As credenciais (URL + service role key) são lidas de `app.supabase_url` e `app.service_role_key`, nunca hardcoded na migration.

## Consequências

- Benefícios:
  - Admins ganham visibilidade proativa sobre NFs iminentes sem depender do GP.
  - O aviso de 3 dias dá tempo para preparar documentação antes da data de emissão.
  - O agendamento é rastreável via migration, não depende de configuração externa invisível.
- Custos:
  - Admins de tenants com muitos projetos receberão mais notificações; podem arquivar ou resolver as que não são de sua responsabilidade direta.
  - O pg_cron exige que as extensões `pg_cron` e `pg_net` estejam habilitadas no Supabase e que os database settings `app.supabase_url` / `app.service_role_key` sejam configurados out-of-band.
- Riscos:
  - Se `app.service_role_key` não estiver configurado, o cron falha silenciosamente; monitorar `cron.job_run_details`.
  - Ambientes de staging/dev precisam do mesmo database setting para que o cron funcione.
- Como reverter:
  - `SELECT cron.unschedule('notify-installment-alerts-daily');`
  - Reverter `notify-installment-alerts/index.ts` para a versão anterior (notifica apenas manager_id, sem alerta 3d).

## Evidências

- Edge Function: `supabase/functions/notify-installment-alerts/index.ts`
- Migration: `supabase/migrations/20260622130000_installment_nf_alert_cron.sql`
- Frontend: `src/components/inbox/InboxDetailPanel.tsx` (categoryConfig `projeto`, statusBadge para os novos tipos)
- Dívida técnica: TD-0001 em `.harness/tech-debt/log.md` (casts `as any` na Edge Function)
