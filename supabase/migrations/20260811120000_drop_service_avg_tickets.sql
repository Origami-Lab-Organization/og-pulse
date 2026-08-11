-- Remove o subsistema de Ticket Médio por serviço.
--
-- Motivo: o ticket médio era o degrau intermediário da cascata de valor da
-- oportunidade (orçamento -> ticket médio -> valor estimado). Na prática ele
-- inventava um valor para negócios que ninguém tinha estimado, e como o
-- formulário de criação nunca expôs o campo de valor, o número exibido no card
-- era quase sempre a média do serviço — não uma estimativa daquele negócio.
--
-- A partir daqui a regra é única: orçamento vinculado se houver, senão o valor
-- que a pessoa responsável informou em `leads.estimated_value`. Ver ADR-0017.
--
-- Sem backfill, por decisão do time: as oportunidades abertas sem orçamento
-- passam a valer o que estiver em `leads.estimated_value` (hoje 0 na maioria).
-- A queda nos KPIs comerciais é esperada e se recompõe conforme o time informa
-- os valores.
--
-- IRREVERSÍVEL: o histórico de médias calculadas e os overrides manuais
-- (`is_manual_override`) são descartados junto com a tabela.

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'recalc-service-avg-tickets-quarterly') THEN
    PERFORM cron.unschedule('recalc-service-avg-tickets-quarterly');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_service_avg_tickets();
DROP FUNCTION IF EXISTS public.recalculate_service_avg_tickets_now();
DROP FUNCTION IF EXISTS public.recalculate_service_avg_tickets();
DROP FUNCTION IF EXISTS public._recalc_service_avg_tickets_core(uuid);

DROP TABLE IF EXISTS public.service_avg_tickets;
