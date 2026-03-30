

## Plano: Correção de Lançamentos Reais via Dialog Estilo Timesheet

### Mudança de abordagem

O fluxo atual (toggle Planejado/Real inline no painel expandido) será substituído por um fluxo mais limpo:

1. PM/Admin expande o funcionário na alocação (painel continua apenas com edição de **planejado**)
2. Um botão "Corrigir lançamentos" aparece no cabeçalho do painel expandido (apenas para PM/Admin)
3. Clica → abre um **Dialog grande** com visualização estilo timesheet semanal do funcionário
4. Realiza ajustes dia-a-dia, preenche motivo e justificativa
5. Salva → fecha o dialog, volta à tela de alocação com dados atualizados

### O que será construído

**1. Novo componente: `AllocationCorrectionDialog.tsx`**

Dialog fullscreen/large (`max-w-5xl`) contendo:
- Header: nome do funcionário + seletor de semana (reusa `TimesheetWeekSelector`)
- Tabela estilo timesheet: linhas = projetos + atividades internas do funcionário, colunas = dias da semana
- Cada célula mostra horas lançadas, editável inline
- Abaixo da tabela: campos de motivo (Select com reason_codes existentes) e justificativa (Textarea, mín. 10 chars)
- Footer: botões Cancelar e Salvar

A tabela busca dados diários reais de `project_timesheets` e `activity_timesheets` para a semana selecionada. Edições são rastreadas localmente e salvas em lote.

**2. Remover toggle Planejado/Real do painel expandido**

O `ToggleGroup` atual e toda lógica de `editMode === 'actual'` / `draftActual` / `originalActual` serão removidos do `AllocationOverview.tsx`. O painel expandido volta a ser exclusivamente para planejamento.

**3. Persistência e auditoria**

Reutilizar `useAllocationActualEdits` adaptado para aceitar `workDate` específico (dia real da correção, não último dia útil). Cada alteração grava:
- Upsert no `project_timesheets` ou `activity_timesheets` com a data específica
- Log em `timesheet_edit_logs` / `activity_timesheet_edit_logs` com reason_code + justificativa

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/timesheets/AllocationCorrectionDialog.tsx` | **Criar** — Dialog com tabela estilo timesheet semanal, campos de auditoria |
| `src/components/timesheets/AllocationOverview.tsx` | **Editar** — remover toggle Plan/Real, remover draftActual/originalActual, adicionar botão "Corrigir lançamentos" que abre o dialog |
| `src/hooks/useAllocationActualEdits.ts` | **Editar** — aceitar `workDate: string` no entry ao invés de calcular último dia útil |
| `src/components/timesheets/AllocationEditableCell.tsx` | **Editar** — remover prop `mode` (volta a ser apenas planned) |
| `src/components/timesheets/AllocationSaveDialog.tsx` | **Editar** — remover prop `mode` (volta a ser apenas planned) |

### Fluxo do usuário

```text
Alocação → Expande funcionário → [Corrigir lançamentos] 
  → Dialog abre com semana atual
  → Navega entre semanas
  → Edita horas nos dias desejados
  → Preenche motivo + justificativa
  → [Salvar] → Persiste + log auditoria → Fecha dialog
  → Dados de "Real" atualizados na alocação
```

### Detalhes técnicos

- O dialog busca projetos e atividades do funcionário via queries existentes (project_members + activity_types)
- Dados diários: query `project_timesheets` filtrada por employee via project_member_id + range de datas da semana; `activity_timesheets` filtrada por employee_id + range
- Edição inline: campos numéricos por dia/item, delta calculado ao salvar
- Reason_code e justificativa são preenchidos uma vez e aplicados a todas as alterações do lote
- Dias não-úteis (feriados/fins de semana) ficam desabilitados/cinza, alinhado com o estilo existente do `TimesheetWeekRow`

