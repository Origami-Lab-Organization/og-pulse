# Harness Engineering — og-pulse
# harness-version: b0b28f5
# generated: 2026-05-20
# status: ACTIVE

## YOU ARE THE INVISIBLE SENIOR DEVELOPER
Read /Users/vrcouto/.harness-core/skills/harness-skill.md before any response.
The harness skill is the Maestro — orchestrates all others automatically.

---
## Project Context
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

---
## Boundaries — NEVER VIOLATE
# Boundaries

## Nunca violar

- Nao remover ou enfraquecer politicas RLS sem uma justificativa explicita, teste e ADR.
- Nao expor dados entre tenants. Toda consulta sensivel deve respeitar `tenant_id`, ownership, role ou politica equivalente.
- Nao tratar dados financeiros, margem, custo, salario, reembolso ou dados pessoais como dados publicos.
- Nao registrar segredos, tokens, chaves Supabase, dados pessoais completos ou payloads sensiveis em logs.
- Nao alterar schema Supabase sem migration versionada.
- Nao alterar regras de negocio financeiro sem teste ou evidencia de validacao manual.
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

---
## Domain Glossary
# Glossario de Dominio

- Cliente: organizacao compradora de servicos.
- Lead: oportunidade comercial em negociacao.
- CRM: gestao de pipeline, interacoes, follow-ups e conversao.
- Servico: oferta comercial precificada e associada a projetos/orcamentos.
- Projeto: entrega contratada, com membros, receitas, parcelas, milestones e status.
- Portfolio: visao consolidada de projetos e saude operacional.
- Orcamento/Budget: estimativa comercial com papeis, horas, materiais, fornecedores, margem e versoes.
- Versao de orcamento: snapshot comparavel de uma proposta.
- Colaborador/Employee: pessoa interna alocavel, com custos, beneficios, ferramentas e status.
- Timesheet: apontamento de horas por atividade/projeto/periodo.
- Activity Type: tipo de atividade usado em apontamentos.
- Reembolso: solicitacao financeira feita por colaborador, com aprovacao e comprovantes.
- Desligamento/Termination: processo de saida de colaborador.
- OKR: objetivo e resultado-chave de estrategia.
- Iniciativa: acao estrategica ligada a objetivo.
- Guardrail: limite ou indicador de controle estrategico.
- Margem bruta: diferenca entre receita e custos diretos.
- Receita reconhecida: valor considerado no periodo conforme regra financeira.
- Parcela/Installment: item de faturamento/recebimento ligado a projeto ou budget.
- Tenant: unidade isolada de dados no sistema.
- RLS: Row Level Security do Supabase para isolamento e autorizacao.

---
## Patterns

### error-handling.md
# Pattern: Error Handling

## Frontend

- Tratar loading, empty e error em telas de dados.
- Usar mensagens claras e acionaveis, sem stack trace.
- Preservar dados preenchidos pelo usuario quando uma acao falhar.
- Mutations com TanStack Query devem invalidar queries relevantes apos sucesso.

## Backend/Edge Functions

- Validar metodo HTTP e payload.
- Retornar status HTTP apropriado.
- Separar erro de validacao, permissao, dependencia externa e erro inesperado.
- Sanitizar mensagens retornadas ao cliente.

## Banco

- Constraints e triggers devem falhar com mensagens compreensiveis quando possivel.
- Migrations precisam ser idempotentes quando houver risco de reexecucao parcial.

### logging.md
# Pattern: Logging

## Regras

- Logs devem ajudar diagnostico sem expor PII, valores sensiveis, tokens ou payloads completos.
- Use logs estruturados em Edge Functions quando possivel: evento, tenant/contexto tecnico anonimo, status e erro sanitizado.
- No frontend, preferir feedback para usuario via toast/estado visual e logs discretos apenas para falhas inesperadas.

## Nunca logar

- Chaves, tokens, cookies, URLs assinadas ou credenciais.
- Dados pessoais completos de colaboradores/candidatos/clientes.
- Valores financeiros detalhados quando nao forem indispensaveis ao diagnostico.
- Respostas completas de APIs externas com dados sensiveis.

### monitoring.md
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

### security.md
# Pattern: Security

## Baseline

- Aplicar LGPD por padrao: minimo necessario, acesso por perfil e sem logs sensiveis.
- Toda tabela com dados de negocio sensiveis deve usar RLS.
- Consultas no frontend devem depender das policies do Supabase e filtrar por contexto quando aplicavel.
- Validar entradas em formulários e Edge Functions com Zod ou validacao equivalente.

## Supabase

- Migrations devem criar ou atualizar policies junto com novas tabelas/colunas sensiveis.
- `security definer` exige comentario de motivo e revisao cuidadosa de `search_path`.
- Edge Functions devem tratar CORS de forma consistente e nunca retornar stack traces para o usuario final.
- Service role keys ficam somente em ambiente de servidor/Edge Function.

## Frontend

- Rotas protegidas devem usar `ProtectedRoute` e `RoleProtectedRoute` quando houver escopo por perfil.
- Estados de erro nao devem vazar payloads internos.
- Download/exportacao de PDF/documentos deve respeitar o mesmo nivel de permissao da tela de origem.

### testing.md
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

### troubleshooting.md
# Pattern: Troubleshooting

## Fluxo rapido

1. Reproduzir o problema localmente ou identificar o fluxo afetado.
2. Ler componentes/hooks/migrations envolvidos antes de alterar.
3. Confirmar se ha policy RLS, role ou tenant envolvido.
4. Corrigir com menor escopo possivel.
5. Rodar verificacoes proporcionais ao risco.
6. Registrar ADR se a solucao mudar arquitetura, permissao ou regra central.

## Comandos uteis

- `rg "termo" src supabase`
- `npm run lint`
- `npm run test`
- `npm run build`

## Checklist de debug

- O usuario tem role correta?
- A query inclui contexto de tenant/projeto/usuario?
- A policy permite select/insert/update/delete esperado?
- O cache do TanStack Query foi invalidado apos mutation?
- A migration existe e esta na ordem correta?

---
## ADRs

### template.md
# ADR NNNN: Titulo

- Status: proposto
- Data: YYYY-MM-DD
- Decisores: 

## Contexto

Descreva o problema, restricoes e alternativas consideradas.

## Decisao

Descreva a escolha feita.

## Consequencias

- Beneficios:
- Custos:
- Riscos:
- Como reverter:

## Evidencias

- Links para PRs, issues, migrations, testes ou documentacao.

---
## Checklist
# AI Review Checklist

- A mudanca respeita RLS, tenant e roles?
- Existe risco de vazamento de dados pessoais, financeiros ou comerciais?
- Regras de negocio alteradas tem teste ou validacao documentada?
- Migrations Supabase sao versionadas, revisaveis e incluem policies quando necessario?
- Edge Functions validam entrada e tratam erros de forma segura?
- Componentes possuem estados de loading, empty e error quando consomem dados?
- Mutations invalidam ou atualizam cache corretamente?
- A UI segue padroes existentes de shadcn/Radix/Tailwind?
- O codigo evita duplicacao relevante e usa helpers/hooks existentes?
- Lint, test e build foram executados ou a impossibilidade foi registrada?

---
## Rules
- NEVER violate boundaries above
- NEVER generate business logic without tests
- NEVER contradict ADR without proposing a new one
- ALWAYS cite skill and pattern used
- ALWAYS explain WHY inline
- ALWAYS assume junior level
- ALWAYS ask before assuming
