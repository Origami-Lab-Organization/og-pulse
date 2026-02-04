

# Plano: Corrigir Acesso para Gerentes de Projeto

## Problema Identificado

Os usuários **Cecília**, **Ítalo** e **Guilherme** foram atualizados para o perfil "Gerente de Projetos" (`system_role = 'manager'`), mas o campo `is_gerente` permanece como `false`.

**Dados atuais no banco:**
| Nome | system_role | is_gerente |
|------|-------------|------------|
| Maria Cecília Prado Coelho | manager | false |
| Italo Cesar Castro | manager | false |
| Guilherme Valadares Pereira | manager | false |

O frontend verifica o campo `is_gerente` para conceder acesso às seções de Gestão, Comercial e Operações, mas esse campo não está sendo atualizado quando o `system_role` muda para `'manager'`.

---

## Solução

Há duas abordagens possíveis:

### Opção A: Sincronizar `is_gerente` automaticamente com `system_role` (Recomendada)

Modificar o formulário de funcionários para definir `is_gerente = true` automaticamente quando `system_role` for `'admin'` ou `'manager'`.

**Vantagens:**
- Mantém compatibilidade com o código existente
- Uma única alteração resolve o problema

### Opção B: Substituir verificações de `is_gerente` por `system_role`

Modificar todos os pontos do código que verificam `is_gerente` para usar `system_role` em vez disso.

**Desvantagens:**
- Requer alterações em múltiplos arquivos
- Maior risco de esquecer algum ponto

---

## Implementação (Opção A)

### 1. Atualizar o Formulário de Funcionários

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

Adicionar lógica para sincronizar `isGerente` baseado no `systemRole`:

```typescript
// Quando o systemRole mudar, atualizar isGerente automaticamente
useEffect(() => {
  const systemRole = form.watch('systemRole');
  if (systemRole === 'admin' || systemRole === 'manager') {
    form.setValue('isGerente', true);
  } else {
    form.setValue('isGerente', false);
  }
}, [form.watch('systemRole')]);
```

### 2. Corrigir os Dados Existentes no Banco

Executar uma atualização para sincronizar os funcionários existentes:

```sql
UPDATE employees 
SET is_gerente = true 
WHERE system_role IN ('admin', 'manager') 
  AND is_gerente = false;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Banco de Dados** | Atualizar `is_gerente = true` para funcionários com `system_role` = 'admin' ou 'manager' |
| `src/components/employees/EmployeeFormDialog.tsx` | Sincronizar `isGerente` automaticamente quando `systemRole` mudar |

---

## Resultado Esperado

Após a correção:

| Nome | system_role | is_gerente | Acesso |
|------|-------------|------------|--------|
| Maria Cecília Prado Coelho | manager | **true** | Gestão, Comercial, Operações |
| Italo Cesar Castro | manager | **true** | Gestão, Comercial, Operações |
| Guilherme Valadares Pereira | manager | **true** | Gestão, Comercial, Operações |

Os Gerentes de Projeto terão acesso imediato às seções corretas após a atualização dos dados e do formulário.

