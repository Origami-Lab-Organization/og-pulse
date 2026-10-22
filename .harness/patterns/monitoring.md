# Pattern: Monitoring

## Sinais a acompanhar

- Falhas em Edge Functions de notificacao, convite, seed e processamento financeiro.
- Erros de RLS/permissao em telas operacionais.
- Falhas de build, lint e testes.
- Tempo de resposta de dashboards analiticos e consultas agregadas.
- Fila de transcricao de reuniao (ADR-0039): o worker roda fora do Supabase e, parado, nao
  gera erro nenhum — a transcricao so nao chega. A aba Reunioes avisa quem olha (pendente ha
  mais de 2 h, transcrevendo ha mais de 3 h), mas o time ainda nao tem alerta. Consulta:
  `SELECT count(*) FROM meeting_transcriptions WHERE status = 'pendente' AND updated_at < now() - interval '2 hours'`.
- Sincronizacao da transcricao do Teams (ADR-0052): o problema de cada reuniao vinculada fica em
  `project_online_meetings.last_error` (ja escrito para a tela) e a ultima verificacao em `last_checked_at`.
  `last_checked_at` parado ha mais de 30 min indica cron ou funcao fora do ar; `last_error` em todas as linhas
  costuma ser segredo do app vencido ou policy do Teams nao concedida (`.harness/integrations/teams-transcricao.md`).

## Praticas

- Toda automacao recorrente deve registrar sucesso/falha de forma rastreavel.
- Erros de usuario devem ser acionaveis; erros internos devem ter mensagem segura e contexto tecnico suficiente para debug.
- Mudancas em fluxo financeiro ou timesheet devem incluir plano de rollback ou mitigacao.
