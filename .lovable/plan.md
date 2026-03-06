

## Plano: Migrar Portfolio.tsx para AppLayout

### Problema
A página `Portfolio.tsx` é a **única** página do sistema que ainda usa o layout antigo com sidebar lateral (`SidebarProvider` + `AppSidebar`). Todas as outras 20+ páginas já usam `AppLayout` com a navbar superior.

### Correção

**`src/pages/Portfolio.tsx`**
- Remover imports de `SidebarProvider`, `SidebarTrigger`, `SidebarInset`, `AppSidebar`, `UserMenu`, `Separator`
- Substituir todo o layout por `AppLayout` com `title="Portfólio de Projetos"`
- Manter a barra de busca e o `PortfolioKanbanBoard` como conteúdo interno
- O kanban precisa de `flex-1 overflow-auto`, então usaremos uma div wrapper com altura adequada

### Arquivo alterado
- `src/pages/Portfolio.tsx`

