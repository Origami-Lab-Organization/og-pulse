

## Plano: Migrar sidebar lateral para menu de navegação no topo

### Visao geral
Substituir a sidebar lateral por uma barra de navegacao fixa no topo da pagina com NavigationMenu do Radix UI. Cada grupo (Meu Espaco, Comercial, Gestao de Projetos, RH, Marketing) sera um trigger que abre um dropdown/gaveta ao hover. Breadcrumbs serao removidos para maximizar area util.

### Estrutura do header
```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Pulse  │ Meu Espaço ▾ │ Comercial ▾ │ Gestão... ▾ │ RH ▾ │ Marketing ▾ │  ... [Inbox] [Avatar] │
└──────────────────────────────────────────────────────────────┘
```

Cada item do menu abre um painel dropdown ao hover com os subitens (links). Items desabilitados mostram tooltip "Em breve". Permissoes (manager/admin) continuam sendo respeitadas para ocultar grupos/items.

### Arquivos

#### `src/components/layout/AppNavbar.tsx` (novo)
- Componente com NavigationMenu do Radix UI
- Logo + "Pulse" a esquerda
- 5 grupos como NavigationMenuTrigger, cada um abrindo NavigationMenuContent com links
- InboxButton + UserMenu a direita
- Respeita permissoes de manager/admin para exibir grupos e itens
- Reutiliza a mesma estrutura de `navigationGroups` da sidebar

#### `src/components/layout/AppLayout.tsx` (reescrever)
- Remover SidebarProvider, AppSidebar, SidebarTrigger, SidebarInset
- Remover breadcrumbs completamente
- Layout: AppNavbar fixo no topo + page header (titulo/descricao/actions) + main content
- Remover prop `breadcrumbs` da interface (ou manter opcional sem renderizar)

#### `src/components/layout/AppSidebar.tsx`
- Manter o arquivo (nao deletar), mas nao sera mais importado pelo AppLayout

### Sobre breadcrumbs
Breadcrumbs serao removidos. O titulo da pagina ja indica onde o usuario esta, e a navegacao por menu no topo torna o contexto claro. Isso libera ~40px de altura vertical para conteudo.

### Arquivos modificados
- `src/components/layout/AppNavbar.tsx` — novo
- `src/components/layout/AppLayout.tsx` — reescrito sem sidebar, sem breadcrumbs, com navbar no topo

