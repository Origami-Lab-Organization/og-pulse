## Plano: Recálculo canônico de snapshots de custo de funcionários

Aplicar a migration SQL fornecida que estabelece o cálculo definitivo de `cost_per_hour` em `project_member_months` e `project_timesheets`, baseado em dias úteis (descontando feriados via `company_holidays`) e ponderado por versões de `employee_versions` ativas em cada período.

### O que a migration faz

1. **`count_employee_cost_business_days(tenant, start, end)`** — conta dias úteis (seg-sex) excluindo feriados fixos e pontuais ativos no tenant.

2. **`recalculate_employee_cost_snapshots(employee_id)`** — para um funcionário:
   - **Member months**: para cada mês planejado, divide o mês em segmentos por versão vigente e calcula `cost_per_hour` ponderado por capacidade (dias úteis × jornada diária).
   - **Timesheets**: para cada lançamento, usa a versão ativa na `work_date` e divide o custo mensal total pela capacidade do mês.

3. **Triggers automáticos** (`BEFORE INSERT OR UPDATE`):
   - `set_project_member_month_cost_snapshot` em `project_member_months`
   - `set_project_timesheet_cost_snapshot` em `project_timesheets`
   - Garantem que novos lançamentos já nasçam com `cost_per_hour` correto.

4. **Backfill final**: executa `recalculate_employee_cost_snapshots` para todos os funcionários de todos os tenants.

### Pontos de atenção

- **Escopo global**: o `DO $$` no final roda para **todos** os funcionários de **todos** os tenants, não só Origami Lab. Confirmar se é o desejado (substitui rates já corrigidos manualmente para Kauany etc., mas como a lógica agora é canônica, isso deve produzir os valores corretos).
- **`SECURITY DEFINER` + `auth.uid()` check**: a função `recalculate_employee_cost_snapshots` valida tenant via `user_belongs_to_tenant` quando chamada por usuário autenticado. Como o `DO $$` roda como superuser (sem `auth.uid()`), o check é pulado — ok para backfill.
- **Triggers `BEFORE UPDATE OF project_member_id, month_number`**: só disparam ao mudar essas colunas. Editar `hours` não recalcula `cost_per_hour` (correto — o custo não depende das horas planejadas, só da versão ativa).
- **Mudança de versão de funcionário não dispara recálculo**: se um `employee_versions` for inserido/atualizado, os snapshots existentes ficam stale até `recalculate_employee_cost_snapshots(employee_id)` ser chamado. Recomendo adicionar trigger em `employee_versions` em migration futura — não incluso aqui.
- **Fallback**: se um funcionário não tem versão cobrindo o mês/data, `cost_per_hour` permanece como está (a função usa `WHERE ... AND cost_per_hour IS NOT NULL` no UPDATE, então não sobrescreve com NULL).

### Detalhes técnicos

- Tabela de feriados usada: `public.company_holidays` (campos: `tenant_id`, `is_active`, `holiday_type` ∈ {`fixed`, `floating`, `one_time`}, `fixed_day`, `fixed_month`, `specific_date`).
- Função `count_employee_cost_business_days` é `STABLE SECURITY DEFINER` — chamável em queries e triggers.
- Fórmula por segmento: `capacidade_segmento = dias_úteis(segmento) × jornada_diaria`, `custo_hora_segmento = custo_mensal / (dias_úteis_mês × jornada_diaria)`, ponderado por capacidade.

### Passos de execução

1. Confirmar com o usuário se está ok rodar o backfill **global** (todos os tenants).
2. Aplicar via `supabase--migration` (tool de schema, pois cria functions/triggers).
3. Após aplicação, validar com query nos dados da Origami Lab (tenant `93e40db0-...`) que `cost_per_hour` em timesheets e member_months bate com expectativa (especialmente Kauany, Enzo, Gabriel, Rafael).
4. Spot-check de totais de custo de projetos comparando com snapshot pré-migration.

### Pergunta antes de implementar

Posso prosseguir aplicando exatamente o SQL enviado (escopo global, todos os tenants), ou prefere limitar o backfill apenas ao tenant da Origami Lab?