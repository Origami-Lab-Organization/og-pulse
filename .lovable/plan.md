

# Reestruturacao do CRM com Leads (sem duplicidade de dados)

## Resumo

Transformar o CRM de kanban baseado em orcamentos para kanban baseado em **leads**. O lead e a entidade principal que percorre o funil de 5 colunas. Os dados do lead (nome, empresa, contato, valor estimado) sao **reaproveitados automaticamente** ao criar o orcamento, eliminando redigitacao.

## Principio: zero redigitacao

Quando o usuario cria um orcamento a partir de um lead:
- O formulario de orcamento abre ja pre-preenchido com `leadName`, `leadContact` e `title` vindos do lead
- O campo "Tipo de Cliente" ja vem selecionado como "Lead" e os campos ficam somente-leitura (pois os dados vem do lead)
- Ao salvar o orcamento, o sistema automaticamente vincula o `budget_id` de volta no lead
- O `estimated_value` do lead pode ser usado como referencia, mas o valor final e calculado pelo orcamento

## Colunas do Kanban

| ID | Label | Cor |
|---|---|---|
| screening | Triagem | cinza |
| qualification | Qualificacao | azul |
| proposal | Proposta | amarelo |
| negotiation | Negociacao | laranja |
| closed | Negocio Fechado | verde |

## Fluxo do Lead

1. **Novo Lead**: botao "Novo Lead" abre dialog com campos: nome da oportunidade, empresa, contato (nome, email, telefone), valor estimado, origem, notas. Cria na coluna "Triagem".
2. **Arrastar entre colunas**: drag-and-drop move o lead entre etapas.
3. **Proposta**: ao chegar nesta coluna, o card exibe botao "Criar Orcamento". Ao clicar, navega para `/budgets/new?leadId=XXX`. O formulario:
   - Pre-preenche titulo com o nome do lead
   - Pre-preenche lead_name com `company_name` ou `name` do lead
   - Pre-preenche lead_contact com email/telefone do lead
   - Campos de lead ficam em modo somente-leitura (dados vem do CRM)
   - Apos salvar, faz UPDATE no lead setando `budget_id`
   - Redireciona de volta ao CRM (nao para /budgets)
4. **Negociacao**: lead com orcamento vinculado pode ser movido livremente. Card mostra badge do orcamento e valor final.
5. **Negocio Fechado**: ao arrastar para esta coluna, abre `CloseBusinessDialog` usando o orcamento vinculado. Se nao houver orcamento, bloqueia com toast.
6. **Arquivar Lead**: disponivel em qualquer etapa. Dialog com dropdown de motivos + campo livre.

## Nova tabela: `leads`

```text
leads
- id (uuid, PK, default gen_random_uuid())
- tenant_id (uuid, NOT NULL)
- name (text, NOT NULL) -- nome da oportunidade
- company_name (text, nullable) -- empresa do lead
- contact_name (text, nullable)
- contact_email (text, nullable)
- contact_phone (text, nullable)
- estimated_value (numeric, default 0)
- source (text, nullable) -- origem (indicacao, site, etc)
- notes (text, nullable)
- crm_stage (text, default 'screening') -- screening/qualification/proposal/negotiation/closed
- budget_id (uuid, nullable, FK -> budgets.id)
- archived (boolean, default false)
- archived_at (timestamptz, nullable)
- archive_reason (text, nullable)
- archive_notes (text, nullable)
- created_by (uuid, nullable)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
```

RLS: admins/managers CRUD, users SELECT (mesmo padrao do tenant).

Trigger `update_updated_at_column` na tabela.

## Arquivos a criar

1. **`src/types/lead.ts`** -- tipos LeadDB, CRM_LEAD_COLUMNS, ARCHIVE_REASONS
2. **`src/services/leadService.ts`** -- CRUD de leads via Supabase
3. **`src/hooks/useLeads.ts`** -- queries e mutations (useLeads, useCreateLead, useUpdateLeadStage, useArchiveLead, useLinkBudgetToLead)
4. **`src/components/crm/LeadFormDialog.tsx`** -- dialog de criacao/edicao de lead
5. **`src/components/crm/LeadKanbanCard.tsx`** -- card do lead no kanban (mostra empresa, valor, badge orcamento, botao criar orcamento na coluna proposta)
6. **`src/components/crm/LeadKanbanColumn.tsx`** -- coluna do kanban
7. **`src/components/crm/LeadKanbanBoard.tsx`** -- board principal com 5 colunas, drag-and-drop, regras de movimentacao
8. **`src/components/crm/ArchiveLeadDialog.tsx`** -- dialog de arquivamento com motivo (dropdown + texto livre)

## Arquivos a modificar

1. **`src/pages/CRM.tsx`** -- trocar `KanbanBoard` por `LeadKanbanBoard`. Botao muda para "Novo Lead". Remover dependencia de `useBudgets`.
2. **`src/pages/BudgetForm.tsx`** -- ler `leadId` da query string:
   - Buscar dados do lead com query simples
   - Pre-preencher `title`, `leadName`, `leadContact` automaticamente
   - Forcar `clientType = 'lead'` e desabilitar edicao dos campos de lead (somente leitura)
   - Apos salvar com sucesso, fazer UPDATE no lead setando `budget_id` e redirecionar para `/crm`

## Card do Lead (LeadKanbanCard)

Exibe:
- Nome da oportunidade
- Empresa (se houver)
- Valor estimado (ou valor final do orcamento se vinculado)
- Badge do orcamento (se vinculado, ex: "ORC-2026-0001") com link para o detalhe
- Botao "Criar Orcamento" (visivel apenas na coluna Proposta ou posterior, se nao houver orcamento)
- Icone de cadeado na coluna "Negocio Fechado"
- Botao de arquivar (icone de arquivo)

## Regras de movimentacao

- Pode mover livremente entre screening, qualification, proposal, negotiation
- Nao pode mover para "closed" sem `budget_id`
- Leads em "closed" ficam travados (nao podem ser arrastados)
- Arquivar e possivel em qualquer etapa

## Motivos de arquivamento

Dropdown com opcoes pre-definidas:
- Sem orcamento / Fora do perfil
- Preco / Budget do cliente
- Prazo / Disponibilidade
- Concorrencia
- Projeto cancelado pelo cliente
- Outro

Campo de texto livre para observacoes adicionais.

## Compatibilidade

- A pagina `/budgets` continua funcionando normalmente
- O `CloseBusinessDialog` existente recebe `BudgetWithDetails` -- nao muda
- O `useCloseBusinessDeal` continua igual
- Orcamentos sem lead continuam funcionando na pagina de orcamentos
- Os componentes antigos do CRM (`KanbanBoard`, `KanbanCard`, `KanbanColumn`) podem ser removidos pois serao substituidos

