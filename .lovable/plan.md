

# Navegacao de Semanas com Scroll Horizontal

## Conceito

Substituir o seletor de semana atual (botoes prev/next com label central) por uma faixa horizontal de "chips" de semanas, com scroll horizontal nativo (trackpad/mouse wheel) e setas nas extremidades. A semana atual fica destacada em verde. O botao "Hoje" sera removido.

## Layout Visual

```text
[<]  [02/02] [09/02] [16/02] [23/02 (verde)] [02/03] ...  [>]
      ^--- scroll horizontal com trackpad/setas ---^
```

- Seta esquerda e direita nas extremidades da area
- Entre as setas, uma area com overflow-x scroll (scroll nativo, sem scrollbar visivel)
- Cada semana e um chip clicavel mostrando "dd/MM - dd/MM"
- Semana atual (que contem hoje) tem fundo verde (`bg-primary text-primary-foreground`)
- Semana selecionada (se diferente da atual) tem borda/outline
- Semanas futuras (apos a semana atual) ficam com estilo desabilitado (opacidade reduzida, nao clicaveis)

## Detalhes Tecnicos

### Arquivo: `src/components/timesheets/TimesheetWeekSelector.tsx`

Reescrever o componente completamente:

1. **Gerar lista de semanas**: Criar ~26 semanas para tras e ate a semana atual (sem semanas futuras alem da atual). Usar `subWeeks`/`addWeeks` a partir de hoje.

2. **Scroll container**: Um `div` com `overflow-x-auto` e `scrollbar-hide` (CSS `scrollbar-width: none`), contendo os chips lado a lado em `flex` com `gap`.

3. **Setas**: Botoes `ChevronLeft`/`ChevronRight` nas extremidades. Ao clicar, fazem `scrollBy` suave no container (ex: 200px).

4. **Auto-scroll**: Ao montar ou ao mudar selecao, fazer `scrollIntoView` do chip selecionado para centraliza-lo.

5. **Chip da semana atual**: `bg-primary text-primary-foreground` (verde do tema).

6. **Chip selecionado (nao atual)**: `border-primary bg-primary/10`.

7. **Remover botao "Hoje"**: Nao mais necessario, pois a semana atual esta sempre visivel e destacada.

8. **Semanas futuras**: Gerar ate a semana atual apenas. `canGoForward` nao e mais necessario pois nao havera chips futuros.

### Arquivo: `src/pages/MyTimesheet.tsx`

- Mover o `TimesheetWeekSelector` para dentro do Card, acima do header da tabela, para que as setas toquem as bordas laterais do card.
- Remover o `div` wrapper `justify-end` que envolve o seletor atualmente.

### CSS auxiliar

Adicionar classe utilitaria no `index.css` para esconder scrollbar:
```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

### Arquivos impactados

- `src/components/timesheets/TimesheetWeekSelector.tsx` -- reescrita completa
- `src/pages/MyTimesheet.tsx` -- reposicionar o seletor dentro do Card
- `src/index.css` -- classe utilitaria scrollbar-hide (se nao existir)
