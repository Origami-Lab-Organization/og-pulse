
# Plano: Simplificar Dropdown de Perfil no Sistema

## Problema Atual

O Select de "Perfil no Sistema" exibe tanto o nome do perfil quanto a descricao dentro de cada item, causando:
- Trigger do Select muito longo
- Layout confuso com texto em multiplas linhas
- Experiencia visual poluida

## Solucao

Simplificar para um dropdown padrao mostrando apenas os nomes dos perfis:
- Usuario
- Gerente de Projetos
- Administrador

## Alteracao

**Arquivo: `src/components/employees/EmployeeFormDialog.tsx`**

Remover a estrutura `flex-col` e exibir apenas o label simples:

```tsx
<FormField
  control={form.control}
  name="systemRole"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Perfil no Sistema *</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o perfil" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {(Object.keys(SYSTEM_ROLE_LABELS) as SystemRole[]).map((role) => (
            <SelectItem key={role} value={role}>
              {SYSTEM_ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Resultado Visual

O dropdown ficara assim:

```text
Perfil no Sistema *
┌────────────────────────────────┐
│ Usuario                      ▼ │
└────────────────────────────────┘

Ao abrir:
┌────────────────────────────────┐
│ Administrador                  │
│ Gerente de Projetos            │
│ Usuario               ✓        │
└────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Simplificar SelectItem para exibir apenas o label |

## Observacao

O import de `SYSTEM_ROLE_DESCRIPTIONS` pode ser removido do arquivo se nao for usado em outro lugar, mas mantemos disponivel em `src/types/employee.ts` para uso futuro na area de configuracoes.
