
## Plano: Secao de Leads Arquivados no CRM

### Abordagem

Criar uma nova pagina `/crm/archived` seguindo o mesmo padrao visual da pagina de Reembolsos (`/reimbursements`): cards de metricas no topo, barra de busca com filtro, tabela com paginacao, e clique na linha abre o detalhe do lead. Admins e gerentes poderao desarquivar leads.

### Metricas Recomendadas (4 cards)

1. **Total Arquivados** -- quantidade total de leads arquivados (icone: Archive)
2. **Valor Perdido** -- soma do `estimated_value` ou `budget.final_total` dos leads arquivados (icone: TrendingDown)
3. **Principal Motivo** -- motivo de arquivamento mais frequente, ex: "Preco (12)" (icone: BarChart3)
4. **Arquivados no Mes** -- quantidade arquivada no mes corrente (icone: CalendarDays)

### Mudancas Necessarias

#### 1. Backend -- Service e Hooks

**`src/services/leadService.ts`**
- Nova funcao `fetchArchivedLeads(tenantId)`: consulta leads com `archived = true`, com os mesmos joins (budget, creator, responsible)
- Nova funcao `unarchiveLead(id)`: atualiza `archived = false`, limpa `archived_at`, `archive_reason`, `archive_notes`

**`src/hooks/useLeads.ts`**
- Novo hook `useArchivedLeads()`: query com key `['archived-leads']`
- Nova mutation `useUnarchiveLead()`: chama `unarchiveLead`, invalida queries `['leads']` e `['archived-leads']`, exibe toast "Lead desarquivado"

#### 2. Nova Pagina -- `src/pages/ArchivedLeads.tsx`

Estrutura seguindo o padrao de `/reimbursements`:
- **Cards de metricas** (4 cards conforme acima)
- **Barra de busca** + **filtro por motivo de arquivamento** (dropdown com os valores de `ARCHIVE_REASONS`)
- **Tabela** com colunas: Nome, Empresa, Etapa (onde estava antes de arquivar), Motivo, Data do Arquivamento, Valor Estimado
- **Paginacao** igual a de reembolsos (10/25/50 por pagina, oculta se < 10 registros)
- **Clique na linha** abre o `LeadDetailDialog` em modo read-only (lead ja arquivado)
- **Botao "Desarquivar"** na tabela (coluna de acoes) -- visivel apenas para admins e gerentes
- **Botao de voltar** para `/crm`

#### 3. LeadDetailDialog -- Ajuste para Arquivados

- Quando o lead esta arquivado, exibir os campos em modo somente leitura (inputs desabilitados)
- Remover opcao de "Arquivar" do menu dropdown
- Exibir badge "Arquivado" com motivo e data

#### 4. Roteamento

**`src/App.tsx`**
- Adicionar rota `/crm/archived` protegida com `RoleProtectedRoute requireManager`

#### 5. Navegacao

**CRM page (`src/pages/CRM.tsx`)**
- Adicionar botao "Arquivados" ao lado de "Novo Lead" que navega para `/crm/archived`

### Detalhes Tecnicos

**Arquivos criados:**
- `src/pages/ArchivedLeads.tsx` -- pagina principal

**Arquivos modificados:**
- `src/services/leadService.ts` -- fetchArchivedLeads, unarchiveLead
- `src/hooks/useLeads.ts` -- useArchivedLeads, useUnarchiveLead
- `src/components/crm/LeadDetailDialog.tsx` -- modo read-only para arquivados
- `src/App.tsx` -- nova rota
- `src/pages/CRM.tsx` -- botao de navegacao

**Nenhuma migracao de banco necessaria** -- o campo `crm_stage` ja preserva a etapa anterior ao arquivamento, e ao desarquivar basta setar `archived = false` sem alterar `crm_stage`.
