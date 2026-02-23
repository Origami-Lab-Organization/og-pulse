

## Habilitar Edicao de Horas pelo Admin/Gerente na Pagina de Alocacao do Funcionario

### Contexto

A pagina de alocacao do funcionario (`/alocacao/:employeeId`) ja possui toda a infraestrutura para edicao administrativa de timesheets (o `AdminWeekEditDialog` e o hook `useAdminBatchEditTimesheets` ja estao implementados). Porem, nao existe um botao na interface para ativar essa funcionalidade. O botao de edicao admin so existe no componente `TimesheetByProject`, que nao e usado nesta pagina.

### Alteracoes

**Arquivo: `src/components/timesheets/TimesheetByEmployee.tsx`**

1. Adicionar uma prop `onAdminEditProject` e `canEdit` ao componente
2. Ao lado do badge "Enviado" em cada projeto travado, exibir um botao de edicao (icone de lapis) visivel apenas para admin/gerentes
3. Ao clicar, chamar `onAdminEditProject(projectId)` que acionara o dialog de edicao ja existente na pagina pai

**Arquivo: `src/pages/EmployeeTimesheetPage.tsx`**

1. Passar as novas props `canEdit` e `onAdminEditProject` para o componente `TimesheetByEmployee`
2. Conectar ao handler `handleAdminEditProject` que ja existe no componente

### Detalhes Tecnicos

No `TimesheetByEmployee.tsx`, adicionar as props:

```typescript
interface TimesheetByEmployeeProps {
  // ... existentes
  canEdit?: boolean;
  onAdminEditProject?: (projectId: string) => void;
}
```

No trecho do badge "Enviado", adicionar o botao de edicao:

```typescript
{projectLocked && (
  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
    <Badge ...>Enviado</Badge>
    {canEdit && onAdminEditProject && (
      <Button variant="outline" size="sm" onClick={() => onAdminEditProject(project.projectId)}>
        <Edit2 className="h-3 w-3" />
      </Button>
    )}
  </div>
)}
```

No `EmployeeTimesheetPage.tsx`, passar as props:

```typescript
<TimesheetByEmployee
  employees={employeeData}
  weekDays={weekDays}
  timesheetEntries={timesheetEntries || []}
  holidays={holidays}
  submissions={submissions}
  isAdmin={isAdmin}
  canEdit={canSubmit}
  onAdminEditProject={handleAdminEditProject}
/>
```

### Fluxo do Usuario

1. Admin/Gerente acessa a pagina de Alocacao
2. Clica em um funcionario (ja funciona, navega para `/alocacao/:employeeId`)
3. Na pagina do funcionario, ao lado de projetos com status "Enviado", aparece um botao de edicao
4. Ao clicar, abre o dialog `AdminWeekEditDialog` com os campos de horas editaveis
5. O usuario ajusta as horas e preenche a justificativa obrigatoria (minimo 10 caracteres)
6. Ao salvar, as alteracoes sao registradas com log de auditoria na tabela `timesheet_edit_logs`

### O que nao muda

- Nenhuma alteracao de banco de dados necessaria (tabelas e RLS ja existem)
- A logica de salvamento e auditoria ja esta implementada no hook `useAdminBatchEditTimesheets`
- O dialog `AdminWeekEditDialog` ja esta funcional e integrado
