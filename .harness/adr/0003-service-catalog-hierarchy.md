# ADR 0003: Hierarquia do catálogo de serviços (Linha → Serviço → Modelo de Receita)

- Status: aceito
- Data: 2026-06-19
- Decisores: Pedro Marinho (Admin), time og-pulse (Hackathon — HU-001)

## Contexto

O catálogo comercial vivia em uma única tabela plana `services`, agrupada apenas por
`billing_type` na UI. A HU-001 (ONDA 0, crítica) pede reorganizar o portfólio numa
hierarquia de 3 níveis para que os GPs montem orçamentos com as condições corretas, sem
planilha paralela e sem quebrar projetos/orçamentos ativos.

Restrições relevantes:

- `lead_services.service_id → services.id` usa `ON DELETE RESTRICT` (referência ativa).
- `services.template_budget_id` e `budgets.template_for_service_id` (`ON DELETE SET NULL`).
- Multi-tenant: RLS por `tenant_id` em todas as tabelas.
- Não deletar dados de catálogo (usar `is_active = false`); migrations preservam o que existe.

Alternativas consideradas:

1. **Renomear `services` → `services_old` e recriar `services`** (sugestão literal da HU-001).
   Rejeitada: quebraria as FKs ativas de `lead_services` e dos templates, gerando órfãos.
2. **Manter `services` e adicionar níveis pai/filho** (escolhida).

Houve divergência inicial de ordem da hierarquia (descrição do usuário colocava o Modelo
acima do Serviço). Confirmado com o usuário: a ordem oficial é **Linha → Serviço → Modelo**,
em linha com o Cenário 4 da HU-001 ("serviço sem modelo de receita").

## Decisão

Hierarquia: `service_lines` (1) → `services` (N) → `service_revenue_models` (N).

- Nova tabela `service_lines` (linha de serviço, ex.: Ventures, Product Studio).
- `services` ganha `service_line_id` (FK `service_lines`, `ON DELETE RESTRICT`).
- Nova tabela `service_revenue_models` por serviço, com `model_type ∈ {fixed, recurring, success_fee, indication, equity}` e `base_value`.
- Migration preserva tudo: cria a linha **"Serviços Gerais"** por tenant e vincula os
  serviços existentes; gera um modelo de receita a partir do `billing_type`/`default_value`
  atual de cada serviço (exceto `no_revenue`), mantendo o fluxo de orçamento funcionando.
- Gestão (CRUD) restrita a **admin**, imposta no **banco** (RLS): SELECT para qualquer
  membro do tenant (GP precisa ler no orçamento); INSERT/UPDATE/DELETE exigem
  `has_role(auth.uid(), tenant_id, 'admin')`. A UI (`canManage = isAdmin`) é apenas a
  primeira camada — a autorização por recurso vive no banco (boundaries.md).
- `services.billing_type`/`default_value` permanecem como legado (back-compat com o wizard
  de orçamento atual); remoção fica para migration futura.

## Consequências

- Benefícios: portfólio organizado; orçamento sempre com condições corretas; sem órfãos.
- Custos: duas tabelas novas, CRUDs e refactor da tela de Serviços; redundância temporária
  entre `services.billing_type` e `service_revenue_models`.
- Riscos: dessincronização entre o `billing_type` legado e os modelos até o wizard migrar.
- Como reverter: a migration é aditiva; é possível dropar as tabelas novas e a coluna
  `service_line_id` sem perder os dados originais de `services`.

## Evidências

- Migration: `supabase/migrations/20260619120000_service_catalog_hierarchy.sql`
- Story: `.hackaton/HACKATHON.md` (HU-001)
- Plano: `~/.claude/plans/quero-que-leia-os-dreamy-sketch.md`
