

# Plano: Corrigir Vazamento de Texto nos Cards de Custo

## Problema Identificado

Os cards de custo estão exibindo texto que quebra inadequadamente, especialmente:
- "50% (-" aparece em uma linha e "R$ 119.040,00)" em outra
- "84% (-" e "R$ 39.040,00)" também quebram
- O símbolo de percentual "~ 54.8%" no card de Margem também está problemático

## Causa Raiz

1. Os cards não têm largura mínima suficiente
2. O texto de porcentagem + diferença não tem `whitespace-nowrap` para evitar quebra
3. Com 5 colunas em grid, cada card fica muito estreito em telas menores

## Solução Proposta

Adicionar classes CSS para controlar a exibição do texto:

1. **Evitar quebra de texto** na linha de porcentagem/diferença
2. **Truncar ou ajustar** quando não couber
3. **Definir largura mínima** nos cards

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`

#### 1. Adicionar `whitespace-nowrap` e `truncate` nas linhas de porcentagem

**CostCard - Linhas 79-108**

Adicionar `whitespace-nowrap` ao container da porcentagem:

```tsx
{baseValue > 0 && (
  <div className="flex items-center gap-1 pt-1 whitespace-nowrap">
    {/* conteúdo existente */}
  </div>
)}
```

#### 2. Adicionar `whitespace-nowrap` nas linhas de valores

Garantir que os valores monetários não quebrem:

- Linha 70: `<span className="text-sm font-medium whitespace-nowrap">`
- Linha 76: `<span className="text-sm font-semibold whitespace-nowrap">`

#### 3. Ajustar o MarginCard da mesma forma

- Linha 140: Adicionar `whitespace-nowrap` no valor do contrato
- Linha 148: Adicionar `whitespace-nowrap` no valor da margem
- Linha 151: Adicionar `whitespace-nowrap` no container de porcentagem

#### 4. Ajustar o grid responsivo

Mudar o grid de 5 colunas para usar largura mínima ou adaptar melhor em telas menores:

**Linha 300 - Antes:**
```tsx
<div className={cn("grid gap-4", isEditable ? "md:grid-cols-5" : "md:grid-cols-4")}>
```

**Depois:**
```tsx
<div className={cn("grid gap-4", isEditable ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-4")}>
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| `whitespace-nowrap` | Evita quebra de linha nos valores e porcentagens |
| Grid responsivo | Melhor adaptação para telas menores (2 colunas em mobile) |
| Valores monetários | Mantém em uma única linha |

---

## Resultado Esperado

1. **Texto não quebra**: Valores e porcentagens ficam em uma linha só
2. **Layout responsivo**: 2 colunas em mobile, expandindo para 4-5 em desktop
3. **Cards legíveis**: Informação apresentada de forma clara e organizada

