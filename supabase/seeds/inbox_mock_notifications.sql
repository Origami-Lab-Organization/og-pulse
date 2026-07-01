-- FUNC-J3 — Notificações MOCKADAS para testar a Caixa de Entrada
-- (abas/categorias variadas + agrupamento por data + Arquivadas + Lixeira).
--
-- Pré-requisito: rodar antes a migration 20260618160000 (read_at/deleted_at).
-- Como usar: troque o e-mail abaixo e rode no SQL Editor.
-- Datas são RELATIVAS (now() - interval), pensadas para rodar por volta do meio do mês.
-- Re-rodar duplica os registros (é um seed de teste) — limpe manualmente se precisar.

WITH me AS (
  SELECT id AS recipient_id, tenant_id
  FROM public.employees
  WHERE email = 'luismigueldesousa2707@gmail.com'  -- <<< TROQUE AQUI
  LIMIT 1
)
INSERT INTO public.notifications
  (tenant_id, recipient_id, type, category, priority, action_url, title, message, is_read, is_archived, deleted_at, created_at, metadata)
SELECT me.tenant_id, me.recipient_id, v.type, v.category, v.priority, v.action_url, v.title, v.message, v.is_read, v.is_archived, v.deleted_at, v.created_at, v.metadata
FROM me, (VALUES
  -- ───────── ESTA SEMANA ─────────
  ('timesheet_reminder',     'timesheet',     'high',   '/my-timesheet',   'Lance suas horas da semana',        'Você ainda não confirmou as horas desta semana.',                          false, false, NULL::timestamptz, now() - interval '2 hours', NULL::jsonb),
  ('card_assigned',          'projeto',       'normal', '/my-kanban',      'Nova atividade atribuída',          'Você foi designado para "Revisar protótipo".',                             false, false, NULL::timestamptz, now() - interval '5 hours', NULL::jsonb),
  ('document_available',     'documento',     'normal', '/documentos',     'Novo holerite disponível',          'Seu holerite de junho já está disponível.',                                false, false, NULL::timestamptz, now() - interval '2 days', NULL::jsonb),

  -- ───────── SEMANA PASSADA ─────────
  ('project_started',        'projeto',       'normal', '/my-projects',    'Projeto iniciado',                  'O projeto "Plataforma Bry" entrou em execução.',                           false, false, NULL::timestamptz, now() - interval '8 days',  NULL::jsonb),
  ('budget_margin_pending',  'budget',        'high',   '/crm',            'Aprovação de margem pendente',      'Um orçamento aguarda sua aprovação de margem.',                            false, false, NULL::timestamptz, now() - interval '9 days',  NULL::jsonb),

  -- ───────── ESTE MÊS (início do mês) ─────────
  ('nps_response_received',  'projeto',       'normal', '/comercial',      'Nova resposta de NPS',              'Um stakeholder respondeu à pesquisa de NPS.',                              true,  false, NULL::timestamptz, now() - interval '14 days', NULL::jsonb),
  ('candidatos',             'candidatos',    'normal', '/rh/candidatos',  'Nova candidatura recebida',         'Uma nova candidatura chegou para a vaga aberta.',                          false, false, NULL::timestamptz, now() - interval '16 days', NULL::jsonb),

  -- ───────── ÚLTIMO MÊS ─────────
  ('project_health_alert',   'projeto',       'high',   '/my-projects',    'Atenção: saúde do projeto',         'O projeto "Verifica" está com indicadores em alerta.',                     true,  false, NULL::timestamptz, now() - interval '35 days', NULL::jsonb),
  ('document_available',     'documento',     'normal', '/documentos',     'Informe de rendimentos disponível', 'Seu informe de rendimentos já pode ser baixado.',                          true,  false, NULL::timestamptz, now() - interval '38 days', NULL::jsonb),
  ('system',                 'system',        'low',    NULL,              'Manutenção programada',             'Houve uma manutenção no sistema no mês passado.',                          true,  false, NULL::timestamptz, now() - interval '40 days', NULL::jsonb),

  -- ───────── MESES ANTERIORES (nome do mês) ─────────
  ('timesheet_submitted',    'timesheet',     'normal', '/my-timesheet',   'Horas enviadas',                    'Suas horas do mês foram enviadas com sucesso.',                            true,  false, NULL::timestamptz, now() - interval '70 days',  NULL::jsonb),
  ('card_assigned',          'projeto',       'normal', '/my-kanban',      'Atividade concluída',               'Atividade "Documentação" marcada como concluída.',                         true,  false, NULL::timestamptz, now() - interval '100 days', NULL::jsonb),

  -- ───────── ARQUIVADAS (aba Arquivadas) ─────────
  ('timesheet_modified',     'timesheet',     'normal', '/my-timesheet',   'Lançamento ajustado',               'Um lançamento de horas foi ajustado pelo gestor.',                         true,  true,  NULL::timestamptz, now() - interval '6 days',  NULL::jsonb),
  ('budget_margin_approved', 'budget',        'normal', '/crm',            'Margem aprovada',                   'A margem do orçamento foi aprovada.',                                      true,  true,  NULL::timestamptz, now() - interval '45 days', NULL::jsonb),

  -- ───────── LIXEIRA (soft-deleted, datas variadas) ─────────
  ('timesheet_reminder',     'timesheet',     'normal', '/my-timesheet',   'Lembrete antigo de timesheet',      'Notificação antiga, movida para a lixeira.',                               true,  false, now() - interval '3 days',  now() - interval '50 days', NULL::jsonb),
  ('document_available',     'documento',     'normal', '/documentos',     'Documento antigo',                  'Documento antigo movido para a lixeira.',                                  true,  false, now() - interval '10 days', now() - interval '80 days', NULL::jsonb)
) AS v(type, category, priority, action_url, title, message, is_read, is_archived, deleted_at, created_at, metadata);
