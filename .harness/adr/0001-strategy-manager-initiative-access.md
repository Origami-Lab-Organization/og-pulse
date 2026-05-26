# ADR 0001: Strategy manager initiative access

- Status: aceito
- Data: 2026-05-26
- Decisores: Origami Lab / operacao interna

## Contexto

O modulo de Estrategia concentra ciclos, OKRs, Key Results, check-ins, guardrails e iniciativas. Antes desta decisao, a rota `/estrategia` era restrita a admins no frontend, enquanto algumas policies historicas de banco permitiam escrita ampla por usuarios do tenant em tabelas de estrategia.

Gerentes precisam acompanhar OKRs e operar iniciativas ligadas a eles, mas nao devem alterar a estrutura dos OKRs nem registrar check-ins de progresso. Pela regra de seguranca do projeto, a autorizacao deve ser garantida por RLS no Supabase, nao apenas por botoes escondidos na UI.

## Decisao

Liberamos `/estrategia` para usuarios com `user_roles.role = manager`, usando o mesmo sinal ja exposto no frontend como `employee.is_gerente`.

OKRs, Key Results, check-ins, ciclos e guardrails ficam com leitura por tenant e escrita apenas para admins. Iniciativas ficam com leitura por tenant e escrita para admins ou managers. Todas as policies de escrita validam tambem que registros filhos apontam para entidades do mesmo `tenant_id`.

## Consequencias

- Beneficios:
  - Gerentes acompanham OKRs sem depender de acesso admin.
  - Gerentes conseguem criar, editar, mover e excluir iniciativas do ciclo ativo.
  - RLS passa a refletir o contrato de produto e mitiga acesso indevido mesmo se a UI falhar.
- Custos:
  - Mais policies especificas para manter nas tabelas `strategy_*`.
  - Testes de autorizacao precisam cobrir diferenca entre OKRs e iniciativas.
- Riscos:
  - Fluxos existentes que dependiam de check-in por manager passam a falhar por design.
  - Ambientes com policies antigas precisam aplicar a migration antes de validar a UI.
- Como reverter:
  - Criar nova migration restaurando escrita de estrategia para managers/admins conforme regra anterior e voltar a rota/menu para admin se necessario.

## Evidencias

- Migration: `supabase/migrations/20260526100000_strategy_manager_access.sql`
- Testes esperados: Vitest para rota/sidebar, OKRs read-only para manager e CRUD de iniciativas para manager.
