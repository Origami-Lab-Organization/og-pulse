
# Plano: Incluir Administradores na Seleção de Gerente de Projeto

## Situação Atual

A seleção de "Gerente do Projeto" filtra apenas funcionários com perfil `manager`:

**ProjectFormDialog.tsx (linha 84):**
```typescript
const managers = employees.filter((e) => e.systemRole === 'manager');
```

**CloseBusinessDialog.tsx (linha 68):**
```typescript
const managerList = employees.filter((e) => e.systemRole === 'manager');
```

## Alteração Proposta

Modificar o filtro para incluir tanto `manager` quanto `admin`:

```typescript
const managers = employees.filter(
  (e) => e.systemRole === 'manager' || e.systemRole === 'admin'
);
```

## Arquivos a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/projects/ProjectFormDialog.tsx` | 84 | Adicionar `|| e.systemRole === 'admin'` |
| `src/components/crm/CloseBusinessDialog.tsx` | 68 | Adicionar `|| e.systemRole === 'admin'` |
| `src/hooks/useEmployees.ts` | 93 | Atualizar hook `useProjectManagers` |

## Atualização do Hook useProjectManagers

Também atualizaremos o hook `useProjectManagers` para manter consistência:

```typescript
// Hook to get project managers (employees with manager or admin role)
export const useProjectManagers = () => {
  const { data: employees = [], ...rest } = useEmployees();
  
  const managers = employees.filter(
    (e) => e.systemRole === 'manager' || e.systemRole === 'admin'
  );
  
  return {
    ...rest,
    data: managers,
  };
};
```

## Atualização da Mensagem de Estado Vazio

Atualizar as mensagens quando não houver gerentes disponíveis:

**Antes:**
```text
Nenhum gerente de projetos cadastrado.
Atribua o perfil "Gerente de Projetos" a um funcionário.
```

**Depois:**
```text
Nenhum gerente disponível.
Atribua o perfil "Gerente de Projetos" ou "Administrador" a um funcionário.
```

## Resultado

A lista de seleção de gerente de projeto exibirá:
- Funcionários com perfil **Gerente de Projetos**
- Funcionários com perfil **Administrador**

Isso faz sentido porque administradores têm acesso completo ao sistema e naturalmente podem gerenciar projetos.
