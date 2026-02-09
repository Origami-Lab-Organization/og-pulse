
# Plano: Portal do Admin e Reorganizacao da Navegacao

## Objetivo

Mover "Tabela de Precos" e "Configuracoes" para dentro de um **Portal do Admin**, acessivel pelo avatar/circulo no canto superior direito. Remover a secao "Configuracoes" do menu lateral.

## Mudancas

### 1. Remover secao "Configuracoes" do sidebar

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Remover o grupo `Configuracoes` (que contem "Tabela de Precos" e "Configuracoes") do array `navigationGroups`. Tambem remover imports nao utilizados (`DollarSign`, `Settings`).

### 2. Criar pagina do Portal do Admin

**Novo arquivo:** `src/pages/AdminPortal.tsx`

Uma pagina com layout proprio (usando `AppLayout`) que consolida as configuracoes em abas:

| Aba | Conteudo | Componente existente |
|-----|----------|---------------------|
| Tabela de Precos | Gestao de papeis e valores hora | Conteudo de `Pricing.tsx` (inline) |
| Financeiro | Percentuais de markup e metas | `FinancialSettingsForm` |
| Encargos/Folha | Configuracao de encargos | `PayrollProfileSettingsForm` |
| Feriados/Folgas | Gestao de feriados | `HolidaysSettingsForm` |

A pagina tera breadcrumbs indicando "Portal do Admin" e usara o componente `Tabs` existente.

### 3. Adicionar opcao "Portal do Admin" no menu do usuario

**Arquivo:** `src/components/layout/UserMenu.tsx`

Adicionar um item de menu "Portal do Admin" (com icone `Shield` ou `Settings`) visivel apenas para admins (`employee.isAdmin`). Ao clicar, navega para `/admin`.

### 4. Atualizar rotas

**Arquivo:** `src/App.tsx`

- Adicionar rota `/admin` com `RoleProtectedRoute requireAdmin`
- Remover rotas `/pricing` e `/settings` (ou manter como redirect para `/admin`)

### 5. Limpar arquivos obsoletos

- `src/pages/Settings.tsx` - pode ser removido (conteudo movido para AdminPortal)
- `src/pages/Pricing.tsx` - pode ser removido (conteudo movido para AdminPortal)

## Detalhes Tecnicos

### UserMenu.tsx - Nova opcao

```typescript
// Visivel apenas para admins
{employee.isAdmin && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => navigate('/admin')}>
      <Shield className="mr-2 h-4 w-4" />
      <span>Portal do Admin</span>
    </DropdownMenuItem>
  </>
)}
```

### AdminPortal.tsx - Estrutura

A pagina usa `Tabs` com 4 abas. A aba "Tabela de Precos" incorpora toda a logica que hoje esta em `Pricing.tsx` (filtros, stats, tabela, dialogs). As demais abas reutilizam os componentes de formulario existentes.

### Rotas em App.tsx

```typescript
<Route
  path="/admin"
  element={
    <RoleProtectedRoute requireAdmin>
      <AdminPortal />
    </RoleProtectedRoute>
  }
/>
```

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/AdminPortal.tsx` | Criar (consolida Settings + Pricing) |
| `src/components/layout/UserMenu.tsx` | Editar (adicionar link Portal do Admin) |
| `src/components/layout/AppSidebar.tsx` | Editar (remover grupo Configuracoes) |
| `src/App.tsx` | Editar (adicionar rota /admin, remover /pricing e /settings) |
| `src/pages/Settings.tsx` | Remover |
| `src/pages/Pricing.tsx` | Remover |
