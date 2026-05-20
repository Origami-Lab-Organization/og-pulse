# Pattern: Monitoring

## Sinais a acompanhar

- Falhas em Edge Functions de notificacao, convite, seed e processamento financeiro.
- Erros de RLS/permissao em telas operacionais.
- Falhas de build, lint e testes.
- Tempo de resposta de dashboards analiticos e consultas agregadas.

## Praticas

- Toda automacao recorrente deve registrar sucesso/falha de forma rastreavel.
- Erros de usuario devem ser acionaveis; erros internos devem ter mensagem segura e contexto tecnico suficiente para debug.
- Mudancas em fluxo financeiro ou timesheet devem incluir plano de rollback ou mitigacao.
