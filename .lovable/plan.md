
# Plano: Renomear Seção "Datas" para "Validade"

## Problema Identificado

Na página de detalhes do orçamento (`BudgetDetail.tsx`), a seção "Datas" ainda mostra:
- **Título**: "Datas"
- **Campo 1**: "Início do Projeto" (usando `start_date`)
- **Campo 2**: "Válido até" (usando `valid_until`)

Conforme o contexto comercial, essa seção deve exibir a **validade do orçamento**, não datas do projeto.

## Alterações Propostas

### Arquivo: src/pages/BudgetDetail.tsx (linhas 183-208)

| Elemento Atual | Novo Valor |
|----------------|------------|
| Título da seção: "Datas" | **"Validade"** |
| Label: "Início do Projeto" | **"Criação do Orçamento"** |
| Label: "Válido até" | Manter como está |

## Detalhes Técnicos

### Código Atual (linhas 183-208):
```tsx
<CardTitle className="flex items-center gap-2">
  <Calendar className="h-5 w-5" />
  Datas
</CardTitle>
...
<p className="text-sm text-muted-foreground">Início do Projeto</p>
```

### Código Novo:
```tsx
<CardTitle className="flex items-center gap-2">
  <Calendar className="h-5 w-5" />
  Validade
</CardTitle>
...
<p className="text-sm text-muted-foreground">Criação do Orçamento</p>
```

## Resultado Esperado

A seção na página de detalhes do orçamento exibirá:

```text
┌─────────────────────────────────────────┐
│ 📅 Validade                             │
├─────────────────────────────────────────┤
│ Criação do Orçamento    Válido até      │
│ 30 de setembro de 2025  29 de outubro   │
└─────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/BudgetDetail.tsx` | Linha 187: "Datas" → "Validade", Linha 193: "Início do Projeto" → "Criação do Orçamento" |
