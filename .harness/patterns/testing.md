# Pattern: Testing

## Comandos de verificacao

- `npm run lint`
- `npm run test`
- `npm run build`

## Estrategia

- Mudanca em regra de negocio compartilhada: adicionar ou atualizar teste unitario.
- Mudanca em componente critico: testar render, estados vazios, loading, erro e interacoes principais.
- Mudanca em schema/RLS: validar migration e cobrir caminho feliz + acesso negado quando possivel.
- Mudanca visual pequena: build e revisao manual podem bastar, desde que sem regra de negocio.

## Areas que exigem cuidado extra

- Calculos financeiros, margem, custos, parcelas e orcamentos.
- Timesheets, locks, submissao e aprovacoes.
- Convites, auth, roles e criacao de usuario.
- Notificacoes automaticas e Edge Functions agendadas.
