---
sources:
  - src/integrations/supabase/types.ts
  - supabase/migrations/20260121002930_945e9a92-8375-4b35-b9eb-291f57ae6716.sql
  - supabase/migrations/20260810190000_project_gpo_reports.sql
  - src/types/lead.ts
  - src/types/portfolio.ts
---

# ERD — Entidades e Relações

> Derivado de `src/integrations/supabase/types.ts` (115 tabelas) + migrations
> mais recentes (total real ~118 tabelas). Aqui estão só as **entidades núcleo**
> (~32), agrupadas em clusters para legibilidade. FKs extraídas dos blocos
> `Relationships` do types.ts; linhas citadas são do types.ts salvo indicação.

## Multi-tenant

Isolamento por **coluna `tenant_id` + RLS** (não schema-per-tenant).
`public.tenants` e a função `user_belongs_to_tenant(_user_id, _tenant_id)`
nascem em `supabase/migrations/20260121002930_*.sql:5-10, 82-92` — o vínculo é
resolvido via `employees.auth_id = auth.uid()`. 69 tabelas têm `tenant_id`
direto; as demais são filhas que herdam o tenant pelo pai (ex.: `budget_roles`
via `budget_id`, `project_installments` via `project_id`). Nos diagramas,
`tenants` aparece só nas raízes para não virar estrela ilegível.

## Cluster 1 — Comercial (Pipeline de Oportunidades)

Obs.: no banco as tabelas chamam-se `leads*` (nomenclatura histórica); na UI o
termo é **Oportunidade/Pipeline** (boundaries.md).

```mermaid
erDiagram
    tenants ||--o{ clients : ""
    tenants ||--o{ leads : ""
    tenants ||--o{ service_lines : ""
    clients ||--o{ client_contacts : ""
    clients ||--o{ leads : "client_id"
    leads ||--o{ lead_services : ""
    leads ||--o{ lead_interactions : ""
    leads ||--o{ lead_follow_ups : ""
    leads ||--o{ lead_activity_log : ""
    services ||--o{ lead_services : "service_id"
    service_lines ||--o{ services : ""
    employees ||--o{ leads : "responsible_id"
    budgets |o--o{ leads : "budget_id"

    leads {
        text crm_stage "screening..stand_by (front src/types/lead.ts:1-8)"
        numeric estimated_value ""
        bool archived "perda arquiva (lead.ts:118-126)"
        timestamptz closed_at ""
    }
    clients {
        text company_name ""
        text cnpj ""
        text status "active|inactive|archived"
    }
```

Fontes: `leads` L1919, `lead_services` L1861, `lead_interactions` L1790,
`lead_follow_ups` L1709, `clients` L775, `services` L5096, `service_lines` L4998.

`leads.crm_stage` é **text sem CHECK** — o contrato de valores vive no front
(`src/types/lead.ts:1-8`): `screening | qualification | proposal | negotiation
| closed | closed_lost | stand_by`.

## Cluster 2 — Orçamento → Projeto → Financeiro

```mermaid
erDiagram
    tenants ||--o{ budgets : ""
    tenants ||--o{ projects : ""
    tenants ||--o{ suppliers : ""
    clients ||--o{ budgets : ""
    clients ||--o{ projects : ""
    leads |o--o{ projects : "lead_id"
    budgets ||--o{ budget_roles : ""
    budget_roles ||--o{ budget_role_months : ""
    budgets ||--o{ budget_versions : "snapshot jsonb"
    budgets ||--o{ budget_suppliers : ""
    projects ||--o{ project_installments : ""
    projects ||--o{ project_costs : ""
    suppliers |o--o{ project_costs : "supplier_id"
    employees ||--o{ projects : "manager_id"

    budgets {
        enum status "budget_status: draft..active"
        numeric final_total ""
        numeric net_margin_percent ""
        bool is_template ""
    }
    projects {
        enum status "project_status: planning..cancelled"
        text portfolio_stage "front src/types/portfolio.ts:1-15"
        numeric total_value ""
        bool is_continuous ""
    }
    project_installments {
        enum status "installment_status: pending..overdue"
        numeric value ""
        date due_date ""
    }
    project_costs {
        numeric planned_amount ""
        numeric actual_amount ""
        text original_currency ""
    }
```

Fontes: `budgets` L578, `budget_roles` L402, `budget_versions` L530,
`projects` L4582, `project_installments` L3559, `project_costs` L3357
(tabela unificada de custos — ADR-0003/0004).

Obs.: `projects.budget_id` existe como coluna, mas **não há FK declarada** nos
Relationships do types.ts (L4582).

## Cluster 3 — Alocação e Timesheet de Projeto

```mermaid
erDiagram
    tenants ||--o{ employees : ""
    projects ||--o{ project_members : ""
    employees ||--o{ project_members : ""
    project_members ||--o{ project_member_months : ""
    projects ||--o{ project_role_allocations : "ADR-0006"
    employees ||--o{ project_role_allocations : ""
    budget_roles |o--o{ project_role_allocations : ""
    projects ||--o{ project_team_rows : ""
    project_team_rows ||--o{ project_team_row_months : ""
    projects ||--o{ project_timesheets : ""
    project_members ||--o{ project_timesheets : ""
    projects ||--o{ project_timesheet_submissions : ""

    employees {
        text status "ativo..desligado (CHECK)"
        text system_role "admin|manager|user (CHECK)"
        bool aloca_em_projetos "ADR-0010"
        numeric salario_mensal ""
        date data_admissao ""
    }
    project_role_allocations {
        int year_month ""
        numeric planned_hours ""
        numeric cost_per_hour ""
    }
    project_timesheets {
        date work_date ""
        numeric hours ""
        bool is_locked ""
    }
```

Fontes: `employees` L1156 (+ `auth_id→auth.users` em
`supabase/migrations/20260121002930_*.sql:16`), `project_members` L3739,
`project_role_allocations` L4042, `project_team_rows` L4398,
`project_timesheets` L4515, `project_timesheet_submissions` L4471.

## Cluster 4 — Execução (Sprints, Kanban, GPO)

```mermaid
erDiagram
    projects ||--o{ project_milestones : ""
    projects ||--o{ project_activity_sprints : ""
    projects ||--o{ project_activity_cards : ""
    project_activity_sprints |o--o{ project_activity_cards : "target_sprint_id"
    project_activity_releases |o--o{ project_activity_cards : "release_id"
    projects ||--o{ project_ritos : ""
    project_ritos ||--o{ project_rito_occurrences : ""
    projects ||--o{ project_gpo_reports : ""
    project_gpo_reports ||--o{ project_gpo_actions : "source_report_id"
    project_gpo_reports ||--o{ project_gpo_action_reviews : ""
    project_gpo_actions ||--o{ project_gpo_action_reviews : ""

    project_activity_sprints {
        int number ""
        text status "planned|active|completed"
    }
    project_gpo_reports {
        date gpo_date "UNIQUE(project_id, gpo_date)"
        date window_start "generated: gpo_date - 14"
        enum status "draft|delivered"
        jsonb metrics_snapshot ""
    }
    project_gpo_action_reviews {
        enum outcome "completed|not_completed"
    }
```

Fontes: `project_milestones` L3797, `project_activity_sprints` L2971,
`project_activity_cards` L2667, `project_ritos` L3940; GPO em
`supabase/migrations/20260810190000_project_gpo_reports.sql:15-70`
(ciclo de vida no ADR-0017 e em `flows/` quando gerado).

## Cluster 5 — Estratégia, RH e Admin

```mermaid
erDiagram
    tenants ||--o{ strategy_cycles : ""
    strategy_cycles ||--o{ strategy_objectives : ""
    strategy_objectives ||--o{ strategy_key_results : ""
    strategy_objectives ||--o{ strategy_initiatives : ""
    strategy_key_results ||--o{ strategy_checkins : ""
    strategy_cycles ||--o{ strategy_guardrails : ""
    tenants ||--o{ user_roles : ""
    tenants ||--o{ notifications : ""
    employees ||--o{ vacation_requests : ""
    vacation_requests ||--o{ vacation_request_approvals : "ADR-0003 férias"
    projects |o--o{ vacation_request_approvals : "project_id"
    employees ||--o{ employee_terminations : ""
    job_openings ||--o{ job_applications : "vaga_id"
    job_applications |o--o{ employees : "candidate_id"

    user_roles {
        enum role "app_role: admin|user|manager|rh"
        uuid user_id "UNIQUE(user_id, tenant_id, role)"
    }
    strategy_key_results {
        numeric current_value ""
        numeric target_value ""
        text confidence ""
    }
    vacation_requests {
        text status "pendente|aprovado|rejeitado"
        int days_requested ""
        bool auto_approved ""
    }
```

Fontes: `strategy_*` L5172-L5470, `user_roles` L6452, `notifications` L2191,
`vacation_requests` L6539, `vacation_request_approvals` L6484,
`employee_terminations` L955, `job_openings` L1516, `job_applications` L1437.

## Enums nativos (types.ts L6915-6993)

| Enum | Valores |
|---|---|
| `app_role` | admin, user, manager, rh |
| `budget_status` | draft, sent, approved, rejected, expired, proposal, negotiation, active |
| `project_status` | planning, active, paused, completed, cancelled |
| `installment_status` | pending, invoiced, sent, received, overdue |
| `time_entry_type` | entrada, inicio_intervalo, fim_intervalo, saida |
| `project_rito_type` | daily, planning, review, retro, outro |
| `termination_status` | pending, in_progress, completed, cancelled, awaiting_documents |
| `project_gpo_report_status`* | draft, delivered |
| `project_gpo_action_outcome`* | completed, not_completed |

\* só em migration (`20260810190000_project_gpo_reports.sql:6,11`) — ainda fora
do types.ts.

## Módulos fora do recorte (existem, não desenhados)

Timesheet por atividade (`activity_timesheets`, `activity_types`…), ponto
eletrônico (`time_entries`, `time_daily_summary`, `time_bank_ledger`,
`time_punch_face_profiles`…), reembolsos (`reimbursement_*` — ver ADR-0007),
kanban pessoal (`personal_kanban_*`), benefícios/ferramentas, folha
(`payroll_*`), análise de mercado (`market_analyses`). Gerar diagrama dedicado
sob demanda.

## Divergências código × doc

1. **`src/integrations/supabase/types.ts` está desatualizado** em relação às
   migrations: não contém `project_gpo_reports`/`project_gpo_actions`/
   `project_gpo_action_reviews` (`20260810190000_*.sql`) nem
   `service_avg_tickets` (`20260806140000_*.sql`), e ainda lista a legada
   `service_line_avg_tickets` (L4928). **Ação sugerida:** regenerar os types
   (`supabase gen types`).
2. **Glossário × código:** o glossário ainda define "Lead" e "CRM" como termos
   correntes, enquanto boundaries.md exige Oportunidade/Pipeline na UI. No
   banco e no código as tabelas/rotas internas continuam `leads`/`crm_stage` —
   a doc registra os dois planos; atualizar o glossário só com OK do dev.
3. **Reembolsos:** ADR-0007 remove o módulo, mas as tabelas `reimbursement_*`
   seguem no schema (types.ts L4786). Confirmar se é legado a limpar ou
   mantido por histórico.
4. `projects.budget_id` sem FK declarada (types.ts L4582) — integridade só por
   convenção.
