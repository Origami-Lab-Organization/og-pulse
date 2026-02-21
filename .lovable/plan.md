

# Ajustes no Formulario de Lead: Remover Valor Estimado + Radio Button Cliente

## Resumo das mudancas

Duas alteracoes no fluxo de criacao/edicao de leads:

1. **Remover campo "Valor Estimado"** do formulario de lead -- esse valor so existe a partir da criacao do orcamento
2. **Adicionar radio button "Cliente existente / Nova empresa"** -- se for cliente existente, exibir um select/combobox com a lista de clientes cadastrados; se for nova empresa, manter o campo texto livre para digitar o nome

## Alteracoes no banco de dados

Adicionar coluna `client_id` (uuid, nullable, FK -> clients.id) na tabela `leads` para vincular a um cliente existente quando selecionado.

## Alteracoes no formulario (LeadFormDialog)

**Campos do formulario revisado:**
- Nome da Oportunidade (obrigatorio)
- Radio button: "Cliente existente" | "Nova empresa"
  - Se "Cliente existente": Select/combobox com clientes do tenant (usando `useClients`). Ao selecionar, preenche automaticamente `company_name` e `client_id`
  - Se "Nova empresa": Campo de texto livre para digitar o nome da empresa
- Contato (nome, email, telefone)
- Origem
- Observacoes

**Campos removidos:**
- Valor Estimado (sera exibido apenas quando houver orcamento vinculado)

## Alteracoes no card (LeadKanbanCard)

- Remover exibicao do `estimated_value` quando nao houver orcamento vinculado
- Exibir valor somente quando houver `budget.final_total`
- Manter exibicao de `company_name` normalmente

## Alteracoes nos tipos e servicos

- `src/types/lead.ts`: adicionar `client_id` ao tipo `LeadDB`
- `src/services/leadService.ts`: incluir `client_id` no `CreateLeadInput`
- `src/hooks/useLeads.ts`: sem mudancas estruturais

## Detalhes tecnicos

### Migracao SQL

```sql
ALTER TABLE public.leads ADD COLUMN client_id uuid REFERENCES public.clients(id);
```

### LeadFormDialog - novo schema

```
schema = z.object({
  name: z.string().min(1),
  client_type: z.enum(['existing', 'new']),
  client_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_name, contact_email, contact_phone, source, notes
})
```

Logica condicional:
- Se `client_type === 'existing'`, `client_id` e obrigatorio via `refine`
- Se `client_type === 'new'`, `company_name` pode ser preenchido livremente
- Ao selecionar um cliente existente, `company_name` e preenchido automaticamente com o `trading_name` ou `company_name` do cliente

### LeadKanbanCard - exibicao de valor

Atualmente exibe `lead.budget?.final_total ?? lead.estimated_value`. Sera alterado para exibir valor **somente** quando houver orcamento vinculado (`lead.budget?.final_total`). Sem orcamento, nao exibe valor.

### Compatibilidade

- O campo `estimated_value` permanece na tabela (default 0) para nao quebrar dados existentes
- A coluna `client_id` permite vincular o lead a um cliente ja cadastrado, facilitando futura rastreabilidade
- Leads existentes sem `client_id` continuam funcionando normalmente

