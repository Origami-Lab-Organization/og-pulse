

# Plano: Adicionar Campo "Data de Vigencia" no Formulario de Edicao

## Objetivo

Permitir que, ao editar um funcionario e alterar campos financeiros (salario, jornada, cargo, etc.), o usuario possa informar a **data de vigencia** da mudanca. Isso resolve o caso do Enzo: a mudanca ocorreu em 01/02, mas esta sendo registrada em 09/02.

## Como Funciona Hoje

1. O formulario detecta automaticamente se campos financeiros mudaram (`hasVersionedChanges`)
2. Ao salvar, passa `createNewVersion: true` para o service
3. O service chama `employeeVersionService.createVersion()` que usa **a data de hoje** como `effectiveFrom`
4. O campo `effectiveFrom` ja aceita uma data customizada, mas a UI nunca envia

## O Que Vai Mudar

Quando o sistema detectar mudancas em campos financeiros durante a edicao, exibira um dialogo de confirmacao com um campo de data, permitindo ao usuario informar desde quando a mudanca vale.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Adicionar dialogo de confirmacao com campo de data de vigencia |
| `src/services/employeeService.ts` | Aceitar e repassar `effectiveFrom` ao criar versao |
| `src/hooks/useEmployees.ts` | Propagar `effectiveFrom` no mutation |
| `src/components/employees/EmployeeFormDialog.tsx` (submit) | Passar `effectiveFrom` no submit |

## Detalhes de Implementacao

### 1. EmployeeFormDialog.tsx - Dialogo de Confirmacao com Data

Quando o usuario clicar "Salvar" e houver mudancas financeiras, em vez de salvar direto, exibir um `AlertDialog` perguntando:

```text
┌─────────────────────────────────────────────┐
│  Novo Marco Financeiro                       │
│                                              │
│  Detectamos alteracoes em campos financeiros │
│  (jornada, salario, cargo, etc).             │
│                                              │
│  A partir de quando esta mudanca e valida?   │
│                                              │
│  Data de Vigencia: [  01/02/2026  ] (picker) │
│                                              │
│  [ Cancelar ]            [ Confirmar ]       │
└─────────────────────────────────────────────┘
```

**Implementacao:**
- Novo estado: `versionConfirmOpen` (boolean), `versionEffectiveDate` (string), `pendingSubmitData` (FormData temporario)
- No `handleSubmit`, se `hasVersionedChanges && isEditing`, guardar os dados e abrir o dialogo em vez de submeter
- No confirmar do dialogo, chamar `onSubmit` com o `effectiveFrom` adicional
- O date picker padrao sera a data de hoje, mas o usuario pode alterar
- Usar o componente Popover + Calendar ja existente no projeto

### 2. EmployeeFormSubmitData - Novo Campo

Adicionar campo opcional `effectiveFrom?: string` na interface `EmployeeFormSubmitData`.

### 3. Index.tsx (handleFormSubmit) - Propagar effectiveFrom

Na chamada `updateEmployee.mutateAsync`, passar o `effectiveFrom`:

```typescript
await updateEmployee.mutateAsync({ 
  id: selectedEmployee.id, 
  updates: employeeData,
  createNewVersion: createNewVersion || false,
  effectiveFrom: data.effectiveFrom,  // novo
});
```

### 4. useEmployees.ts (useUpdateEmployee) - Aceitar effectiveFrom

O mutation recebe e repassa `effectiveFrom` para o service:

```typescript
mutationFn: async ({ id, updates, createNewVersion, effectiveFrom }) => {
  return employeeService.update(id, updates, createNewVersion, effectiveFrom);
}
```

### 5. employeeService.ts (update) - Repassar para versionService

```typescript
async update(id, updates, createNewVersion = false, effectiveFrom?: string) {
  // ... update employee ...
  if (createNewVersion) {
    await employeeVersionService.createVersion({
      employeeId: id,
      effectiveFrom,  // agora passa a data informada (ou undefined = hoje)
      ...
    });
  }
}
```

O `employeeVersionService.createVersion` ja trata `effectiveFrom` como opcional e usa a data atual como fallback. Nenhuma alteracao necessaria nesse service.

## Fluxo do Usuario (Caso Enzo)

1. Abrir formulario do Enzo
2. Alterar Jornada Mensal para 126h e Bolsa Estagio para R$ 1.200,00
3. Clicar "Salvar"
4. Sistema detecta mudancas financeiras e abre o dialogo
5. Usuario altera a data para **01/02/2026**
6. Clicar "Confirmar"
7. O sistema salva as alteracoes e cria o marco financeiro com vigencia a partir de 01/02/2026

## Notas Tecnicas

- O campo de data usara o componente `Calendar` + `Popover` ja existente no projeto, com `pointer-events-auto`
- A data padrao no picker sera a data atual
- Datas no formato `YYYY-MM-DD` serao tratadas como datas locais (conforme padrao do projeto)
- Nenhuma alteracao de banco de dados necessaria -- a coluna `effective_from` ja existe na tabela `employee_versions`
