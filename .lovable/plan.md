

# Corrigir erro "React.Children.only" no ProjectFormDialog

## Problema

O campo "Data de Renovacao" foi colocado **dentro** do `FormControl` do checkbox "Projeto Continuo". O `FormControl` usa o componente `Slot` do Radix, que aceita apenas UM filho. Quando `isContinuous = true`, ele recebe dois filhos (Checkbox + FormField da data de renovacao), causando o crash.

## Solucao

### 1. Corrigir estrutura do formulario (`ProjectFormDialog.tsx`)

Mover o bloco condicional `{isContinuous && <FormField name="renewalDate" .../>}` para **fora** do FormField do checkbox `isContinuous`. Ele deve ficar como um campo independente logo apos o bloco do checkbox.

Estrutura correta:

```text
<FormField name="isContinuous">
  <FormItem>
    <FormControl>
      <Checkbox />          <-- unico filho do FormControl
    </FormControl>
    <div>labels...</div>
  </FormItem>
</FormField>

{isContinuous && (
  <FormField name="renewalDate">
    ...                     <-- campo independente, fora do FormField anterior
  </FormField>
)}
```

### 2. Atualizar dados no banco

Definir `renewal_date = '2026-12-31'` para o projeto "Gestao de Portfolio" (id: `bf5657e4-e706-4c5a-83b8-e08b0612ff80`).

### 3. Aplicar mesmo fix no `dialog.tsx`

O `DialogPortal` tambem tem o mesmo problema (ja foi corrigido com Fragment no ultimo commit para alert-dialog, mas o dialog.tsx original tem dois filhos diretos no Portal). Verificar se precisa do mesmo fix -- pela analise, o dialog.tsx atual ja funciona porque o `DialogPortal` do `@radix-ui/react-dialog` aceita multiplos filhos (diferente do alert-dialog).

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/projects/ProjectFormDialog.tsx` | Mover campo renewalDate para fora do FormControl do checkbox |
| Banco de dados (UPDATE) | Setar renewal_date para o projeto especifico |

