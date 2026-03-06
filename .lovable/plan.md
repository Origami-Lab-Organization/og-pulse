

## Plano: Alinhar dropdowns abaixo dos respectivos triggers

### Problema
O `NavigationMenuViewport` é renderizado uma única vez dentro do `NavigationMenu` root, posicionado com `absolute left-0`. Isso faz todos os dropdowns abrirem alinhados à esquerda do container de navegação, não abaixo do trigger clicado.

### Solução
Remover o `NavigationMenuViewport` do `NavigationMenu` root e usar a abordagem de conteúdo inline — cada `NavigationMenuContent` se posiciona relativamente ao seu `NavigationMenuItem` pai. Para isso:

#### `src/components/layout/AppNavbar.tsx`
- Envolver cada `NavigationMenuItem` com `className="relative"` para que o `NavigationMenuContent` se posicione relativo ao item
- Adicionar `position: absolute` ao content para ficar abaixo do trigger

#### `src/components/ui/navigation-menu.tsx`
- No componente `NavigationMenu`, remover a renderização automática do `<NavigationMenuViewport />` — o viewport centraliza todos os dropdowns num único ponto
- Cada `NavigationMenuContent` já tem posicionamento absoluto; basta que o pai (`NavigationMenuItem`) tenha `position: relative`

### Arquivos modificados
- `src/components/ui/navigation-menu.tsx` — remover `NavigationMenuViewport` do root
- `src/components/layout/AppNavbar.tsx` — adicionar `relative` nos `NavigationMenuItem` e estilizar o content

