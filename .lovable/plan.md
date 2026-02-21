
## Adicionar contagem de tempo nos cards do CRM

### Problema
Os cards do CRM nao mostram ha quanto tempo o lead foi criado. O usuario quer ver o tempo decorrido desde a criacao, parando a contagem quando o lead chega em "Negocio Fechado" ou e arquivado.

### Solucao

**1. Migracao no banco** - Adicionar coluna `closed_at` na tabela `leads`

Atualmente nao existe um campo para registrar quando o lead foi fechado. Precisamos dele para "congelar" o tempo no momento do fechamento.

```sql
ALTER TABLE public.leads ADD COLUMN closed_at timestamptz;
```

**2. Atualizar o servico** - Gravar `closed_at` ao fechar o negocio

No `leadService.ts`, a funcao `updateLeadStage` passara a gravar `closed_at: new Date().toISOString()` quando o stage for `closed`.

**3. Atualizar o tipo** - Adicionar `closed_at` ao `LeadDB`

No `types/lead.ts`, incluir `closed_at: string | null`.

**4. Adicionar contagem de tempo no card** - `LeadKanbanCard.tsx`

- Criar funcao utilitaria que calcula o tempo decorrido entre `created_at` e a data de referencia:
  - Se `crm_stage === 'closed'`: usar `closed_at` (ou `updated_at` como fallback)
  - Se `archived === true`: usar `archived_at`
  - Caso contrario: usar `new Date()` (tempo corrente)
- Formatar em linguagem amigavel: "2h", "3d", "2sem", "1m", "1a"
- Exibir com icone de relogio (Clock) ao lado do nome do lead, no canto direito do header do card

### Detalhes tecnicos

A formatacao do tempo seguira estas regras:
- Menos de 1 hora: "Xmin"
- 1-23 horas: "Xh"
- 1-6 dias: "Xd"
- 7-29 dias: "Xsem" (semanas)
- 30+ dias: "Xm" (meses)
- 365+ dias: "Xa" (anos)

Nenhuma dependencia nova sera necessaria - o calculo sera feito com `Date` nativo.
