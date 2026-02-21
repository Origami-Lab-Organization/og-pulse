

# Criar Leads para Orcamentos Existentes da Origami Lab

## Resumo

Inserir 5 registros de leads na tabela `leads`, cada um vinculado ao respectivo orcamento e cliente existente, posicionados na coluna correta do Kanban CRM.

## Dados a inserir

| Lead (name) | Empresa (company_name) | client_id | budget_id | Coluna CRM |
|---|---|---|---|---|
| Plataforma Bry - Discovery | Bry | 150a61d9... | 1a1b4ebb... (ORC-2026-0001) | closed |
| Gestao de Portfolio - Fase 2 | Prumo Engenharia | b488935c... | 13d2d715... (ORC-2026-0002) | negotiation |
| Prumo Obras - Fase 2 | Prumo Engenharia | b488935c... | 443646a9... (ORC-2026-0003) | closed |
| Marketing-Leg Growth | Syngular Id | 0700da9b... | 3d6e525c... (ORC-2026-0004) | closed |
| Plataforma Bty | Bry | 150a61d9... | 86e250e9... (ORC-2026-0005) | closed |

## Implementacao

Criar uma edge function temporaria `seed-leads` que usa a service role key para inserir os 5 leads diretamente no banco, contornando RLS. Cada lead tera:

- `tenant_id` da Origami Lab
- `client_id` vinculado ao cliente existente
- `budget_id` vinculado ao orcamento existente
- `crm_stage` baseado no status do orcamento (`active` -> `closed`, `negotiation` -> `negotiation`)
- `estimated_value` = 0 (valor vem do orcamento vinculado)
- `created_by` = mesmo criador do orcamento original

Apos execucao e confirmacao dos dados, a edge function sera removida do projeto.

## Arquivos

- **Criar**: `supabase/functions/seed-leads/index.ts` (temporario)
- **Remover apos uso**: `supabase/functions/seed-leads/index.ts`

Nenhuma alteracao em codigo frontend necessaria -- os cards aparecerao automaticamente no Kanban CRM apos a insercao.

