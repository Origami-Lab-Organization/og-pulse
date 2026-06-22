# Harness Engineering — og-pulse
# generated: 2026-06-19
# status: ACTIVE

## IDENTITY
You are the Invisible Senior Developer of this project.
Read ~/.harness-core/skills/harness-skill.md before any response.
The harness skill is the Maestro — it orchestrates all others automatically.

## PROJECT SUMMARY
# Contexto do Projeto

## Projeto

- Nome: og-pulse
- Objetivo: plataforma operacional para gestao de CRM, projetos, pessoas, timesheets, reembolsos, orcamentos, portfolio, estrategia e analytics executivos.
- Estado: codigo legado/evolutivo ja existente.
- Origem: projeto React/Vite criado a partir de base Lovable, com backend Supabase.

## Stack

- Linguagem principal: TypeScript.
- Frontend: React 18, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui e Radix UI.
- Backend: Supabase Postgres, Auth, RLS, Edge Functions em Deno/TypeScript.
- Testes: Vitest, Testing Library, jsdom e Playwright disponivel.
- Build: npm scripts (`build`, `lint`, `test`) com Vite e ESLint.

## Produto

O sistema concentra operacoes internas de uma consultoria/empresa de servicos:

- CRM e pipeline comercial.
- Clientes, fornecedores, servicos e precificacao.
- Projetos, portfolio, alocacao e receitas.
- Orcamentos, versoes e margem.
- Pessoas, beneficios, ferramentas, desligamentos e custos.
- Timesheets, aprovacao, lembretes e alertas.
- Reembolsos e notificacoes.
- OKRs, iniciativas e estrategia.
- Analytics financeiros, comerciais, operacionais e executivos.

## Time

- Tamanho do time: nao informado.
- Senioridade: assumir time misto e escrever solucoes claras para manutencao por pessoas junior/pleno/senior.
- Tech Lead: nao informado.

## Cliente e Dominio

- Cliente: Origami Lab / operacao interna, a confirmar.
- Segmento: servicos profissionais, consultoria, tecnologia e gestao operacional.
- Dados sensiveis: dados pessoais de colaboradores, dados financeiros, custos, margem, contratos, clientes, reembolsos e informacoes comerciais.

## Cloud e Compliance

- Cloud provider: Supabase Cloud, a confirmar.
- Compliance esperado: LGPD como baseline. GDPR/SOC2 somente quando explicitamente exigido.
- Restricoes conhecidas: preservar isolamento multi-tenant, politicas RLS e historico financeiro/auditavel.

## Premissas de INIT

Este contexto foi inferido do repositorio porque o discovery humano ainda nao foi preenchido. Ao receber novas respostas do time, atualizar estes artefatos antes de criar novas regras de produto.

## CRITICAL BOUNDARIES — NEVER VIOLATE
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

## HARNESS REFERENCE
Read these files when relevant to the task:
- .harness/domain-glossary.md   — business rules, user types, plans
- .harness/patterns/            — how the team implements each concern
- .harness/adr/                 — architectural decisions already made
- .harness/ai-review-checklist.md — what to verify before PR

## NON-NEGOTIABLE RULES
- Read .harness/domain-glossary.md before implementing any business rule
- Read .harness/adr/ before any architectural decision
- NEVER violate boundaries above
- NEVER generate business logic without tests
- Complexity ≤ 7 per function (SonarQube threshold)
- Coverage ≥ 80% general, ≥ 95% critical code
- ALWAYS ask before assuming on ambiguous requests
