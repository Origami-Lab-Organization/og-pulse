# Boundaries

## Nunca violar

- Nao remover ou enfraquecer politicas RLS sem uma justificativa explicita, teste e ADR.
- Nao expor dados entre tenants. Toda consulta sensivel deve respeitar `tenant_id`, ownership, role ou politica equivalente.
- Nao tratar dados financeiros, margem, custo, salario, reembolso ou dados pessoais como dados publicos.
- Nao registrar segredos, tokens, chaves Supabase, dados pessoais completos ou payloads sensiveis em logs.
- Nao alterar schema Supabase sem migration versionada.
- Nao alterar regras de negocio financeiro sem teste ou evidencia de validacao manual.
- Nao criar ou alterar UI/copy/rota sem conformar ao Design System oficial (`jornadas/docs/origami-ds.html`) e a jornada relevante (`jornadas/gp-comercial.md`, `jornadas/funcionario.md`). Ver `patterns/design-system.md`.
- Nao usar nomenclatura antiga na interface comercial ("Lead", "CRM", "Funil") — usar Oportunidade/Pipeline/Orcamentos.
- Nao substituir componentes/padroes de UI existentes por biblioteca nova sem decisao registrada.
- Nao criar ou alterar UI/copy/rota sem conformar ao Design System oficial (`jornadas/docs/origami-ds.html`) e a jornada relevante (`jornadas/gp-comercial.md`, `jornadas/funcionario.md`). Ver `patterns/design-system.md`.
- Nao usar nomenclatura antiga na interface comercial ("Lead", "CRM", "Funil") — usar Oportunidade/Pipeline/Orcamentos.
- Nao commitar arquivos gerados volumosos, builds ou credenciais.

## Regras de manutencao

- Preferir padroes existentes em `src/components`, `src/hooks`, `src/integrations` e migrations.
- Mudancas em permissoes, roles, aprovacao, valores monetarios e notificacoes exigem leitura da migration relevante e teste do fluxo.
- Edge Functions devem validar entrada, autenticar quando aplicavel e retornar erros estruturados.
- Componentes devem manter acessibilidade de Radix/shadcn e estados de loading/empty/error.
- Toda nova regra multi-etapa precisa ser localizada em helper/hook reutilizavel quando compartilhada por mais de uma tela.

## Sinais de risco

- SQL com `security definer`, triggers, cron/notification functions ou alteracoes de policy.
- Calculos de margem, custo hora, receita, parcelas, budgets, timesheet locks e aprovacao.
- Telas admin, convites, criacao de usuarios e seed/demo tenant.
