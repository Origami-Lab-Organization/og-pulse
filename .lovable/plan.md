

# Plano: Ajustes na Visualizacao de Orcamento

## Problemas Identificados

### 1. Cores Pretas nos Graficos
As variaveis CSS `--chart-1`, `--chart-2`, `--chart-3`, `--chart-4`, `--chart-5` nao estao definidas no arquivo `src/index.css`. Quando uma variavel CSS nao existe, o `hsl(var(--chart-1))` resulta em preto.

### 2. Botoes Desnecessarios
Os botoes "Voltar" e "Duplicar" devem ser removidos da pagina de detalhes do orcamento.

## Solucao

### Parte 1: Definir Variaveis de Cores para Graficos

Adicionar as variaveis de cores no `src/index.css` tanto para o tema claro quanto para o escuro:

```css
:root {
  /* ... variaveis existentes ... */
  
  /* Chart colors - Paleta distinta para graficos */
  --chart-1: 152 60% 45%;   /* Verde vibrante */
  --chart-2: 200 70% 50%;   /* Azul */
  --chart-3: 280 65% 55%;   /* Roxo */
  --chart-4: 35 85% 55%;    /* Laranja */
  --chart-5: 340 70% 50%;   /* Rosa */
}

.dark {
  /* ... variaveis existentes ... */
  
  /* Chart colors - Paleta distinta para graficos (dark mode) */
  --chart-1: 152 55% 50%;
  --chart-2: 200 65% 55%;
  --chart-3: 280 60% 60%;
  --chart-4: 35 80% 55%;
  --chart-5: 340 65% 55%;
}
```

### Parte 2: Remover Botoes "Voltar" e "Duplicar"

No arquivo `src/pages/BudgetDetail.tsx`, remover:
- Botao "Voltar" (linhas 108-111)
- Botao "Duplicar" (linhas 112-115)
- Import do `useDuplicateBudget` e `ArrowLeft`
- A funcao `handleDuplicate` (linhas 79-83)

Codigo atual (linhas 106-121):
```tsx
actions={
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => navigate('/budgets')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
    <Button variant="outline" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
      <Copy className="mr-2 h-4 w-4" />
      Duplicar
    </Button>
    <Button onClick={() => navigate(`/budgets/${id}/edit`)}>
      <Edit className="mr-2 h-4 w-4" />
      Editar
    </Button>
  </div>
}
```

Codigo novo:
```tsx
actions={
  <Button onClick={() => navigate(`/budgets/${id}/edit`)}>
    <Edit className="mr-2 h-4 w-4" />
    Editar
  </Button>
}
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Adicionar variaveis `--chart-1` a `--chart-5` nos temas claro e escuro |
| `src/pages/BudgetDetail.tsx` | Remover botoes "Voltar" e "Duplicar", imports e funcao relacionada |

## Resultado Esperado

- Graficos exibindo cores distintas e vibrantes (verde, azul, roxo, laranja, rosa)
- Nenhuma cor preta nos graficos
- Apenas o botao "Editar" visivel na pagina de detalhes do orcamento

