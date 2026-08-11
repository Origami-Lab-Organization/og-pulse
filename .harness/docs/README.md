# Documentação Viva — og-pulse

Docs derivadas do código (ADR-037 do harness-core). Formato Mermaid, com
`sources:` no frontmatter para o drift-check. Consulta sob demanda — nunca
injetada no SessionStart. Gerada em 2026-08-11.

## Índice

| Doc | O que mostra | Embasada em |
|---|---|---|
| [architecture/overview.md](architecture/overview.md) | Stack, providers, rotas por módulo e guards, fluxo de um request (sequência), auth + Microsoft SSO, PWA | ADR-0016 (SSO), ADR-0004 (PWA), `.harness/patterns/security.md` |
| [architecture/erd.md](architecture/erd.md) | ~32 entidades núcleo em 5 clusters, multi-tenant (tenant_id + RLS), enums e status | glossário (`.harness/domain-glossary.md`), ADR-0003/0004 (custos), ADR-0006 (alocações), ADR-0010 (aloca_em_projetos), ADR-0017 (GPO) |
| [architecture/integrations.md](architecture/integrations.md) | Sistemas externos (Microsoft Graph/Entra, Resend, Anthropic, Lovable Gateway), 27 Edge Functions, crons pg_cron, env vars, direção e credencial de cada chamada | ADR-0016 (SSO), ADR-0009 (ponto facial), ADR-0004 (alertas de parcela) |

## Ainda não gerado (sob demanda)

- `flows/` — ciclos de vida por entidade (`stateDiagram-v2`): oportunidade
  (`crm_stage`), projeto (`status` + `portfolio_stage`), relatório GPO
  (ADR-0017), timesheet (draft→submitted→locked), férias, desligamento.
- ERDs dedicados dos módulos fora do recorte: ponto eletrônico, timesheet por
  atividade, folha/benefícios, kanban pessoal.

## Divergências abertas (ver seção própria em cada doc)

1. `types.ts` desatualizado vs migrations (GPO, `service_avg_tickets`) — regenerar types.
2. Camada de service opcional na prática (73/122 hooks vão direto ao Supabase) — decidir se vira regra (ADR) ou fica registrado.
3. Glossário usa "Lead/CRM"; boundaries exige Oportunidade/Pipeline na UI — atualizar glossário só com OK do dev.
4. Tabelas `reimbursement_*` no schema apesar do ADR-0007 (remoção do módulo).
5. Edge functions sem validação de chamador (`seed-demo-tenant`, `register-tenant`, `recalculate-employee-costs`, `market-analysis-start`) e verificação facial client-side — candidatos a TD/correção.
6. 4 funções de lembrete de timesheet sem cron nem chamador no repo — agendamento externo ou código morto.
