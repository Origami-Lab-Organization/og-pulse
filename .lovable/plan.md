

## Simplificar Visualizacao da Minha Timesheet

### Problema

Atualmente, cada projeto e um card separado com cabecalho, header de dias e uma linha com o nome do funcionario. Como o funcionario so ve suas proprias horas, isso gera muita repeticao visual (headers de dias repetidos em cada card, nome do funcionario repetido).

### Solucao

Transformar em uma unica tabela compacta onde cada **linha e um projeto**. O cabecalho dos dias aparece uma unica vez no topo. Cada linha mostra: nome do cliente/projeto, inputs dos 5 dias, total e status (badge + botao enviar).

### Layout proposto

```text
+-----------------------------+------+------+------+------+------+-------+---------+
| Projeto                     | seg  | ter  | qua  | qui  | sex  | Total | Status  |
+-----------------------------+------+------+------+------+------+-------+---------+
| Cliente A / Projeto X       | [2]  | [4]  | [8]  | [6]  | [0]  | 20.0h | Enviar  |
| Cliente B / Projeto Y       | [8]  | [8]  | [8]  | [8]  | [8]  | 40.0h | Enviado |
+-----------------------------+------+------+------+------+------+-------+---------+
```

### Alteracoes

**Arquivo: `src/pages/MyTimesheet.tsx`**

- Remover os cards individuais por projeto
- Criar um unico Card com uma tabela
- Header unico com os dias da semana (mostrado uma vez)
- Cada projeto vira uma linha, usando `TimesheetWeekRow` com:
  - `label` = nome do projeto
  - `subLabel` = nome do cliente
  - Sem avatar (remover)
  - `memberId` = primeiro membro do projeto (que e o proprio funcionario)
- Status (badge Enviado/Rascunho) e botao Enviar movidos para depois da coluna Total, dentro da propria linha
- O componente `TimesheetWeekRow` precisa de um ajuste para suportar uma coluna extra de acoes (ou as acoes ficam fora do componente, ao lado dele)

**Arquivo: `src/components/timesheets/TimesheetWeekRow.tsx`**

- Adicionar prop opcional `actionSlot` (ReactNode) para renderizar conteudo apos a coluna de total
- Ajustar o grid para acomodar a coluna extra de acoes quando fornecida
- Tornar o avatar opcional (ja e, via `avatarUrl !== undefined`, mas passaremos `undefined` para nao mostrar)

### Detalhes tecnicos

No `MyTimesheet.tsx`, a secao de timesheet fica:

```tsx
<Card>
  <CardContent className="pt-4">
    {/* Header unico */}
    <div className="grid grid-cols-[1fr_repeat(5,60px)_80px_120px] ...">
      <div>Projeto</div>
      {weekDays.map(day => ...)} {/* dias */}
      <div>Total</div>
      <div>Status</div>
    </div>

    {/* Uma linha por projeto */}
    {projects.map(project => {
      const member = project.members[0]; // unico membro (o funcionario)
      return (
        <TimesheetWeekRow
          key={member.memberId}
          label={project.projectName}
          subLabel={project.clientName}
          projectId={project.projectId}
          memberId={member.memberId}
          weekDays={weekDays}
          existingEntries={timesheetEntries}
          holidays={holidays}
          isLocked={isLocked}
          isAdmin={false}
          actionSlot={/* badge + botao enviar */}
        />
      );
    })}
  </CardContent>
</Card>
```

No `TimesheetWeekRow.tsx`:
- Adicionar prop `actionSlot?: React.ReactNode`
- Quando `actionSlot` presente, usar grid com coluna extra: `grid-cols-[1fr_repeat(5,60px)_80px_120px]`
- Caso contrario, manter grid atual (retrocompativel com a tela de admin)

