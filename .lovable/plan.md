

# Melhorar Equipe do Projeto na Visao Geral

## Objetivo
Enriquecer o card de equipe na aba Visao Geral para mostrar, alem do nome e foto, o **papel no projeto** (`role`), as **horas planejadas** (soma dos `project_member_months`) e as **horas realizadas** (soma dos timesheets) para cada membro.

## Layout Proposto por Membro

```text
+-----------------------------------------------+
| [Avatar]  Victor                               |
|           Desenvolvedor Frontend               |
|           40h planejadas | 32h realizadas       |
+-----------------------------------------------+
```

- **Linha 1**: Primeiro nome (como hoje)
- **Linha 2**: Papel no projeto (`member.role`)
- **Linha 3**: Horas planejadas (soma de `project_member_months`) e horas realizadas (soma de timesheets)

O tooltip mantera o nome completo, papel, senioridade e detalhes.

## O que muda

- O componente `ProjectTeamSection` passara a receber dois novos props: `memberMonths` e `timesheets`
- Esses dados ja sao buscados no `ProjectOverviewTab` (hooks `useProjectMemberMonths` e `useTimesheetsByMembers`), entao basta passa-los como props
- Cada card de membro mostrara o `role` e as horas planejadas vs realizadas

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `ProjectTeamSection.tsx` | Adicionar props `memberMonths` e `timesheets`, calcular horas por membro, atualizar layout do card |
| `ProjectOverviewTab.tsx` | Passar `memberMonths` e `timesheets` como props para `ProjectTeamSection` |

## Detalhes tecnicos

### ProjectTeamSection.tsx
- Adicionar na interface de props: `memberMonths: { project_member_id: string; hours: number }[]` e `timesheets: { project_member_id: string; hours: number }[]`
- Para cada membro, calcular:
  - `plannedHours = memberMonths.filter(mm => mm.project_member_id === member.id).reduce((s, mm) => s + mm.hours, 0)`
  - `actualHours = timesheets.filter(t => t.project_member_id === member.id).reduce((s, t) => s + t.hours, 0)`
- No card, exibir:
  - `member.role` como texto secundario (xs, muted)
  - `Xh plan. | Yh real.` como terceira linha
- No tooltip, adicionar as horas planejadas e realizadas

### ProjectOverviewTab.tsx
- Passar `memberMonths={memberMonths}` e `timesheets={timesheets}` ao componente `ProjectTeamSection`

