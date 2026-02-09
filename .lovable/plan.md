
# Correcao: Fundo da Barra de Progresso de Verde para Cinza

## Problema

O componente `Progress` usa `bg-secondary` como cor de fundo da faixa nao preenchida. No design system atual, `--secondary` e um verde medio (`hsl(152, 40%, 50%)`), o que da a impressao de progresso mesmo quando o valor e 0%. Isso prejudica a leitura visual do usuario.

## Solucao

Alterar a classe de fundo do componente `Progress` de `bg-secondary` para `bg-muted`, que e um tom neutro/cinza claro no tema light e escuro no tema dark. Isso faz com que a faixa nao preenchida apareca claramente como "sem progresso".

## Mudanca

| Arquivo | Acao |
|---------|------|
| `src/components/ui/progress.tsx` | Trocar `bg-secondary` por `bg-muted` na classe do `Root` |

A alteracao e de uma unica palavra e afeta automaticamente todos os componentes que usam `<Progress>` no sistema (OKRs, Key Results, e qualquer outro lugar).

### Valores de referencia

- Light mode: `--muted: 145 25% 93%` (cinza esverdeado muito claro, quase branco)
- Dark mode: `--muted: 160 30% 18%` (cinza escuro)

Ambos contrastam bem com a barra verde de progresso (`bg-primary`).
