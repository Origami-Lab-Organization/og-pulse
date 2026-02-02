

# Plano: Rodapé Fixo com Tamanho Igual ao Footer da Sidebar

## Análise

Ao analisar o `SidebarFooter` e `SidebarHeader` do menu lateral:

**SidebarHeader (topo):**
- Classes: `border-b border-sidebar-border`
- Conteúdo interno: `px-2 py-3` com logo `h-8 w-8`
- Altura aproximada: ~56px (32px logo + 24px padding vertical)

**SidebarFooter (rodapé):**
- Classes base: `flex flex-col gap-2 p-2`
- Classes adicionais: `border-t border-sidebar-border`
- Conteúdo: `px-3 py-2` com duas linhas de texto

Ambos compartilham:
- Borda (`border-t` ou `border-b`)
- Padding similar (`p-2` base)

## Solução

Ajustar o rodapé fixo dos botões para ter a mesma aparência visual do footer da sidebar, usando:

1. **Posicionamento fixo** com `left` dinâmico baseado no estado da sidebar
2. **Altura e padding** similares ao `SidebarFooter`: usando `py-3` para alinhar com o header que tem `py-3`
3. **Transição suave** ao colapsar/expandir a sidebar

### Mudanças Técnicas

**1. Importar `useSidebar` e `cn`:**

```tsx
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
```

**2. Usar o hook no componente:**

```tsx
const { state: sidebarState } = useSidebar();
const isCollapsed = sidebarState === 'collapsed';
```

**3. Alterar o footer para fixed com dimensões corretas:**

```tsx
<div 
  className={cn(
    "fixed bottom-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 transition-[left] duration-200 ease-linear",
    isCollapsed ? "left-[3rem]" : "left-[16rem]"
  )}
>
```

**4. Ajustar estrutura para remover wrapper desnecessário e adicionar padding:**

```tsx
{/* Current step content */}
<div className="mt-6 pb-16">
  {renderStepContent(currentStep)}
</div>

{/* Fixed footer outside the flex wrapper */}
```

## Resumo das Alterações

| Local | Alteração |
|-------|-----------|
| Imports | Adicionar `useSidebar` de `@/components/ui/sidebar` |
| Componente | Adicionar `const { state: sidebarState } = useSidebar()` |
| Wrapper (linha 637-638) | Remover `flex flex-col min-h-[calc(100vh-200px)]` |
| Conteúdo (linha 640) | Mudar para `mt-6 pb-16` |
| Footer (linha 644-679) | Mudar para `fixed` com `left` dinâmico e `py-3` |

## Resultado Esperado

- Rodapé fixo que permanece visível durante o scroll
- Alinhamento correto com a sidebar (respeitando largura expandida/colapsada)
- Altura visual igual ao header da sidebar (~56px)
- Transição suave ao colapsar/expandir a sidebar

## Arquivo a Modificar

- `src/pages/BudgetForm.tsx`

