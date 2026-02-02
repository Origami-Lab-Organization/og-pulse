

# Plano: Redesign da Barra de Resumo Financeiro

## Problemas de UX Identificados

### 1. Posicionamento Incorreto
A barra atual usa `fixed bottom-0 left-0 right-0`, ocupando **toda a largura da tela**, invadindo o espaco da sidebar. Isso cria desalinhamento visual.

### 2. Densidade Excessiva
Todos os elementos estao em uma unica linha horizontal com espacamento uniforme, sem hierarquia visual. O usuario nao consegue distinguir rapidamente:
- O que e informacao (somente leitura)
- O que e editavel (inputs)
- O que e o resultado final (destaque)

### 3. Falta de Agrupamento Visual
Os separadores verticais nao sao suficientes para criar grupos logicos claros. A informacao parece "jogada" na tela.

### 4. Inputs Perdidos no Contexto
Os inputs de Comissao, Margem e Desconto estao misturados com textos, dificultando identificar onde o usuario pode interagir.

## Solucao: Layout em 2 Linhas com Cards Agrupados

Reorganizar o rodape em **duas linhas** com agrupamentos visuais claros:

```text
LINHA 1: Custos e Composicao (informacional + inputs)
+--------------------------------------------------+
| [Custos]         | [Composicao]      | [Markup]  |
| MO: R$ X         | Desp.Adm: R$ X    | Comissao  |
| Forn: R$ X       | Impostos: R$ X    |  [input]  |
| Mat: R$ X        |                   | Margem    |
| ─────────────    |                   |  [input]  |
| Total: R$ X      |                   |           |
+--------------------------------------------------+

LINHA 2: Preco Final (destaque no resultado)
+--------------------------------------------------+
|   Preco Venda: R$ X   |  Desconto: R$ [input]  |  VALOR FINAL: R$ X  |
+--------------------------------------------------+
```

## Mudancas Detalhadas

### 1. Posicionamento Respeitando a Sidebar

Mudar de:
```tsx
<div className="fixed bottom-0 left-0 right-0 z-50">
```

Para um posicionamento que considera o layout da sidebar. Como o rodape esta DENTRO do `SidebarInset`, podemos usar `sticky` em vez de `fixed`:

```tsx
// No BudgetForm.tsx - trocar o wrapper
<div className="sticky bottom-0 z-40 -mx-6 -mb-6">
  <BudgetFinancialSummary layout="footer" ... />
</div>
```

### 2. Novo Layout do Componente Footer

Estrutura visual em 2 partes:
- **Parte superior**: Custos + Composicao + Inputs de ajuste
- **Parte inferior**: Preco de Venda → Desconto → Valor Final

```tsx
<div className="border-t bg-card shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
  {/* Linha superior - informacoes detalhadas */}
  <div className="border-b border-border/50 px-6 py-3">
    <div className="flex items-start gap-8">
      {/* Grupo: Custos */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">Custos</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          <span className="text-muted-foreground">Mao de Obra</span>
          <span className="text-right font-medium">R$ X</span>
          ...
        </div>
      </div>
      
      {/* Grupo: Composicao */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">Composicao</span>
        ...
      </div>
      
      {/* Grupo: Markup Editavel */}
      <div className="space-y-2 ml-auto">
        <div className="flex items-center gap-3">
          <Label>Comissao</Label>
          <Input ... />
        </div>
        <div className="flex items-center gap-3">
          <Label>Margem</Label>
          <Input ... />
        </div>
      </div>
    </div>
  </div>
  
  {/* Linha inferior - resultado final em destaque */}
  <div className="px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-8">
      <div>
        <span className="text-muted-foreground text-sm">Preco de Venda</span>
        <span className="font-semibold text-lg ml-2">R$ X</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Desconto</span>
        <Input className="w-28" ... />
      </div>
    </div>
    
    {/* Destaque do valor final */}
    <div className="flex items-center gap-3 bg-primary/10 rounded-xl px-6 py-3">
      <span className="font-semibold">Valor Final</span>
      <span className="text-2xl font-bold text-primary">R$ X</span>
    </div>
  </div>
</div>
```

### 3. Hierarquia Visual Melhorada

| Elemento | Tratamento |
|----------|-----------|
| Labels de grupo | `text-xs uppercase text-muted-foreground font-medium` |
| Valores informativos | `text-sm text-foreground` |
| Totais parciais | `font-semibold` |
| Inputs | Fundo branco, borda sutil, agrupados visualmente |
| Valor Final | `bg-primary/10 rounded-xl px-6 py-3 text-2xl font-bold text-primary` |

### 4. Sombra Invertida (Efeito Elevacao)

Adicionar sombra "para cima" para dar sensacao de elevacao:
```tsx
shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetFinancialSummary.tsx` | Redesenhar layout footer completo |
| `src/pages/BudgetForm.tsx` | Trocar `fixed` por `sticky` com margens negativas |

## Beneficios da Nova Abordagem

1. **Hierarquia clara**: Usuario sabe instantaneamente o que e info vs. input vs. resultado
2. **Grupos visuais**: Custos, Composicao e Markup estao claramente separados
3. **Destaque no resultado**: Valor Final tem prominencia visual adequada
4. **Respeita sidebar**: Usa sticky em vez de fixed, funcionando dentro do layout
5. **Menos dense**: Duas linhas em vez de uma, com espacamento adequado
6. **Sombra elegante**: Efeito de elevacao sutil que separa do conteudo
7. **Responsivo**: Facil adaptar para telas menores empilhando grupos

## Detalhes Tecnicos

### CSS do Container Principal

```css
.footer-summary {
  background: hsl(var(--card));
  border-top: 1px solid hsl(var(--border));
  box-shadow: 0 -4px 20px -4px rgba(0,0,0,0.08);
}
```

### Sticky vs Fixed

- `fixed`: Elemento sai do fluxo, posicionado relativo a viewport
- `sticky`: Elemento permanece no fluxo, "gruda" quando atinge a posicao

Usar `sticky bottom-0` faz o rodape "grudar" no final do scroll, mas respeitando os limites do container pai (que ja considera a sidebar).

### Margens Negativas

Para que o rodape sticky ocupe toda a largura do container de conteudo:
```tsx
<div className="sticky bottom-0 z-40 -mx-6 -mb-6">
```

Isso compensa o padding do container pai (`px-6 py-6`).

