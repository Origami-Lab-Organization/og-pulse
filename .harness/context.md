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
