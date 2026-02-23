
## Corrigir Layout da Linha de Projeto com Badge "Enviado" e Botao "Editar"

### Problema

O badge "Enviado" e o botao "Editar" estao posicionados com `absolute`, sobrepondo os campos de horas e o total. O grid do header tem 7 colunas mas a linha de dados nao tem espaco para os controles adicionais.

### Solucao

Usar o prop `actionSlot` que o `TimesheetWeekRow` ja suporta nativamente. Quando `actionSlot` e passado, o componente automaticamente adiciona uma coluna extra de 140px ao grid. Isso elimina a necessidade de posicionamento absoluto.

### Alteracoes

**Arquivo: `src/components/timesheets/TimesheetByEmployee.tsx`**

1. Remover o wrapper `<div className="relative">` e o bloco com posicionamento absoluto
2. Passar o badge "Enviado" e o botao "Editar" como `actionSlot` do `TimesheetWeekRow`
3. Ajustar o grid do header para incluir a coluna extra quando houver projetos travados com permissao de edicao

**De (modo normal, linhas 332-367):**

```
<div className="relative">
  {projectLocked && (
    <div className="absolute right-2 top-1/2 ...">
      <Badge>Enviado</Badge>
      <Button>Editar</Button>
    </div>
  )}
  <TimesheetWeekRow ... />
</div>
```

**Para:**

```
<TimesheetWeekRow
  ...
  actionSlot={projectLocked ? (
    <> 
      <Badge>Enviado</Badge>
      {canEdit && onAdminSaveEdit && (
        <Button onClick={startEditing}>Editar</Button>
      )}
    </>
  ) : undefined}
/>
```

4. Atualizar o grid do header para usar a mesma quantidade de colunas (`grid-cols-[1fr_repeat(5,60px)_80px_140px]`) quando existir algum projeto com acoes visiveis, mantendo o alinhamento

5. Tambem ajustar o grid do modo de edicao inline para incluir a coluna extra, mantendo consistencia visual
