

## Plano: Correção de Lançamentos Reais na Alocação

### Contexto
Hoje o painel expandido do funcionário na página `/alocacao` só permite editar horas **planejadas**. Gerentes e Admins precisam também corrigir horas **reais** (lançadas pelos funcionários) com motivo e justificativa obrigatórios. A infraestrutura de auditoria (`timesheet_edit_logs` e `activity_timesheet_edit_logs` com `reason_code`) já existe no banco.

### O que será construído

**1. Toggle Plan/Real no painel expandido**
- Adicionar um `Tabs` ou `ToggleGroup` no topo do painel expandido com duas opções: **Planejado** (atual) e **Real** (novo)
- Em modo "Planejado": comportamento atual (editar `project_member_months` / `activity_employee_months`)
- Em modo "Real": as células editáveis mostram os totais reais mensais e permitem ajustar

**2. Cálculo do real mensal editável**
- O real vem de `project_timesheets` e `activity_timesheets` (por dia). Para correção mensal, o sistema buscará os totais agrupados por mês
- A edição será por **delta mensal**: o PM/Admin informa o novo total do mês e o sistema calcula a diferença
- A persistência será feita via um upsert em um registro de ajuste no último dia útil do mês (ou via distribuição proporcional — ver abaixo)

**3. Estratégia de persistência dos ajustes de real**
- Para **projetos**: criar/atualizar um registro em `project_timesheets` com `work_date` = último dia do mês, marcado como ajuste. Usar `useAdminEditTimesheet` existente para gravar + log de auditoria
- Para **atividades internas**: criar/atualizar registro em `activity_timesheets` no último dia do mês. Gravar log em `activity_timesheet_edit_logs`

**4. Restrição de acesso**
- O toggle "Real" só aparece para usuários com `employee.is_gerente || employee.isAdmin`
- Funcionários comuns continuam vendo o painel apenas em modo planejado (sem toggle)

**5. Dialog de confirmação com auditoria**
- Reutilizar `AllocationSaveDialog` existente, que já exige `reason_code` e justificativa
- Ao salvar no modo "Real", o dialog mostrará as alterações como "De X → Para Y" por item/mês
- Gravar em `timesheet_edit_logs` (projetos) e `activity_timesheet_edit_logs` (atividades)

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/components/timesheets/AllocationOverview.tsx` | Adicionar toggle Plan/Real, estado `draftActual`, lógica de save para real, busca de IDs de timesheets para logs |
| `src/components/timesheets/AllocationEditableCell.tsx` | Aceitar prop `mode: 'planned' \| 'actual'` para ajustar visual (bordas azuis para real vs âmbar para plan) |
| `src/components/timesheets/AllocationSaveDialog.tsx` | Adicionar prop `mode` para label contextual ("alocação planejada" vs "horas reais") |
| `src/hooks/useAllocationActualEdits.ts` | **Criar** — hook com mutation para persistir correções de real (projetos + atividades) com logs de auditoria |

### Fluxo do usuário
1. PM/Admin expande funcionário → vê toggle [Planejado | Real]
2. Seleciona "Real" → células mudam para mostrar valores reais editáveis
3. Ajusta valores nos meses desejados
4. Clica "Salvar alterações" → abre dialog com lista de mudanças + motivo + justificativa
5. Confirma → sistema grava ajustes + logs de auditoria → fecha painel

### Detalhes técnicos

- A query principal já busca `actualByMonth` para cada item — basta usar esses dados como `originalActual`
- Para gravar o log, precisamos do `id` do timesheet individual. Faremos uma query adicional lazy (ao expandir em modo Real) buscando os IDs dos registros por `project_member_id` + `work_date` no mês
- Para atividades internas, usaremos o `id` do `activity_timesheets` para o log
- O ajuste de real será feito como um único registro no último dia útil do mês (ajuste líquido), evitando alterar lançamentos individuais dos funcionários

