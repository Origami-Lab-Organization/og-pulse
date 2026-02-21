
# Adicionar "Linha de Servico" a Leads e Projetos

## Resumo

Adicionar o campo `service_line` (Linha de Servico) em leads e projetos. As opcoes serao:
- Financiamento da Inovacao
- Consultoria Estrategica
- Product Studio
- Educacao Corporativa
- Ventures

Leads terao este campo obrigatorio na criacao. Projetos herdarao o valor do lead ao fechar negocio, e projetos existentes poderao ser editados para definir a linha de servico.

---

## Alteracoes

### 1. Migracao de banco de dados

Adicionar coluna `service_line` (text, nullable) nas tabelas `leads` e `projects`:

```sql
ALTER TABLE public.leads ADD COLUMN service_line text;
ALTER TABLE public.projects ADD COLUMN service_line text;
```

### 2. Constantes compartilhadas

Criar constante `SERVICE_LINE_OPTIONS` em `src/types/lead.ts` (reutilizada por projetos):

```
Financiamento da Inovacao
Consultoria Estrategica
Product Studio
Educacao Corporativa
Ventures
```

### 3. Formulario de Lead (`LeadFormDialog.tsx`)

- Adicionar campo `service_line` ao schema Zod (obrigatorio)
- Adicionar Select no formulario logo apos o campo "Nome da Oportunidade"
- Incluir `service_line` no payload enviado ao backend

### 4. Detalhe do Lead (`LeadDetailDialog.tsx`)

- Adicionar `service_line` ao schema e ao formulario de edicao
- Exibir a linha de servico no dialog de detalhe
- Incluir no auto-save

### 5. Card do Lead no Kanban (`LeadKanbanCard.tsx`)

- Exibir a linha de servico como texto discreto no card

### 6. Tipo Lead (`src/types/lead.ts`)

- Adicionar `service_line: string | null` ao `LeadDB`

### 7. Service do Lead (`leadService.ts`)

- Adicionar `service_line` ao `CreateLeadInput`

### 8. Tipo Projeto (`src/types/project.ts`)

- Adicionar `service_line?: string` ao `ProjectDB` e `CreateProjectInput`

### 9. Formulario de Projeto (`ProjectFormDialog.tsx`)

- Adicionar campo Select "Linha de Servico" na aba "Dados Basicos"
- Incluir no schema Zod (opcional)
- Mapear no submit

### 10. Service do Projeto (`projectService.ts`)

- Incluir `service_line` no create e update

### 11. Fechar Negocio (`useCloseBusinessDeal.ts`)

- Ao criar o projeto, herdar `service_line` do lead vinculado ao budget

### 12. Tabela de Projetos (`ProjectsTable.tsx`)

- Adicionar coluna "Linha de Servico" na tabela de listagem

### 13. Header do Projeto (`ProjectHeader.tsx`)

- Exibir a linha de servico no header do detalhe do projeto
