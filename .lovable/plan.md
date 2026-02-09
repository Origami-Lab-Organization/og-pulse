

# Aumentar Card de Membro da Equipe

## Problema
O card atual esta compacto demais, truncando o papel e as horas do membro. O grid usa muitas colunas (`grid-cols-6`) fazendo cada card ficar estreito.

## Solucao

Ajustar o layout do grid e o tamanho dos cards em `ProjectTeamSection.tsx`:

1. **Reduzir colunas do grid** para dar mais espaco a cada card:
   - De: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
   - Para: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

2. **Aumentar padding e espacamento** do card:
   - Padding de `p-3` para `p-4`
   - Gap de `gap-3` para `gap-4`

3. **Remover truncate** da linha de horas para garantir que `100h plan. | 136h real.` apareca completo

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `ProjectTeamSection.tsx` | Ajustar grid-cols, padding e remover truncate da linha de horas |

