

# Plano: Remover Dropdown de Status e Corrigir Status Padrao

## Problema Identificado

1. **Dropdown de Status no formulario**: O formulario de funcionario tem um dropdown que permite alterar o status manualmente, mas o status deve ser controlado apenas pelas acoes especificas (Bloquear, Desbloquear, Arquivar, Reenviar Convite)

2. **Status padrao incorreto**: Ao criar um novo funcionario, o formulario inicializa com status `'ativo'` ao inves de `'aguardando_confirmacao'`

3. **Funcionaria Mariana com status incorreto**: Mariana foi criada antes do novo sistema de status e esta com status `'ativo'` mesmo sem ter feito login (ela tem `auth_id` mas nunca logou)

---

## Alteracoes Necessarias

### 1. Remover Dropdown de Status do Formulario

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

Remover completamente o FormField do status (linhas 757-777):

```typescript
// REMOVER ESTE BLOCO COMPLETO:
<FormField
  control={form.control}
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Status</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="inativo">Inativo</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 2. Corrigir Status Padrao para Novos Funcionarios

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

Na linha 330, alterar o valor padrao:

```typescript
// DE:
status: 'ativo',

// PARA:
status: 'aguardando_confirmacao',
```

### 3. Nao Enviar Status na Atualizacao de Funcionario

O status nao deve ser enviado quando o usuario salva alteracoes no formulario, pois ele so pode ser alterado pelas acoes especificas.

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

No `handleSubmit`, remover o campo `status` do objeto enviado ao `onSubmit`:

```typescript
// No onSubmit, nao incluir o status:
onSubmit({
  nome: data.nome,
  email: data.email,
  // ... outros campos
  // NAO incluir: status: data.status,
});
```

### 4. (Opcional) Corrigir Status da Mariana no Banco

Executar query para corrigir o status da Mariana:

```sql
UPDATE employees 
SET status = 'aguardando_confirmacao' 
WHERE email = 'mariana@origamilab.com.br' 
AND status = 'ativo';
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Remover dropdown de status, corrigir status padrao, nao enviar status no update |

---

## Fluxo Correto de Status

```text
[Novo Funcionario Cadastrado]
        |
        v
  aguardando_confirmacao  <-- Status inicial (automatico)
        |
   [Primeiro Login]
        |
        v
      ativo  <-- Muda automaticamente no login (AuthContext)
        |
  [Admin Bloqueia via Acao]
        |
        v
    bloqueado  <-- Muda via acao "Bloquear"
        |
   [Admin Desbloqueia ou Arquiva]
        |
    ativo ou arquivado  <-- Muda via acoes
```

---

## Criterios de Aceite

1. O dropdown de status NAO aparece no formulario de funcionario
2. Novos funcionarios sao criados com status `aguardando_confirmacao`
3. Ao editar um funcionario, o status NAO e alterado (permanece o mesmo do banco)
4. O status so pode ser alterado atraves das acoes: Bloquear, Desbloquear, Arquivar
5. O status muda para `ativo` automaticamente no primeiro login

