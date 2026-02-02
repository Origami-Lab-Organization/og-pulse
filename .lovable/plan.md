

# Plano Definitivo: Corrigir Bug de Duplicacao de Orcamentos

## Problema Real Identificado

Apos analise detalhada do codigo, encontrei **DOIS BUGS CRITICOS**:

### Bug 1: Ordem de Declaracao (Hoisting)
```tsx
// Linha 176 - USA a variavel
if (isSubmitting) { ... }

// Linha 213 - DECLARA a variavel (DEPOIS de usar!)
const isSubmitting = createMutation.isPending || updateMutation.isPending;
```

A variavel `isSubmitting` e usada ANTES de ser declarada, entao a verificacao sempre ve `undefined` (falsy) e nao bloqueia nada.

### Bug 2: Arquitetura do Form

O `form.handleSubmit(handleSubmit)` esta no elemento `<form>`, e qualquer submissao do formulario (Enter em inputs, comportamento do navegador) chama a funcao `handleSubmit`. A protecao dentro da funcao nao e suficiente - precisamos **remover o onSubmit do form** e controlar manualmente.

## Solucao Definitiva

### Mudanca 1: Mover Declaracao de isSubmitting

Mover a linha 213 para ANTES da funcao `handleSubmit` (apos linha 173):

```tsx
// ANTES de handleSubmit
const isSubmitting = createMutation.isPending || updateMutation.isPending;

const handleSubmit = (values: FormValues) => {
  // Agora isSubmitting esta definido
  if (isSubmitting) return;
  // ...
};
```

### Mudanca 2: Remover onSubmit do Form

Trocar de:
```tsx
<form onSubmit={form.handleSubmit(handleSubmit)}>
```

Para:
```tsx
<form onSubmit={(e) => e.preventDefault()}>
```

### Mudanca 3: Chamar Submit Manualmente Apenas no Botao Final

Modificar o botao "Criar Orcamento" (linha 507) para chamar o submit manualmente:

```tsx
<Button 
  type="button"  // Mudar de "submit" para "button"
  onClick={() => form.handleSubmit(handleSubmit)()}
  disabled={isSubmitting}
>
  Criar Orcamento
</Button>
```

E o botao "Salvar" no modo de edicao (linha 523):

```tsx
<Button 
  type="button"
  onClick={() => form.handleSubmit(handleSubmit)()}
  disabled={isSubmitting}
>
  Salvar
</Button>
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/BudgetForm.tsx` | 4 alteracoes pontuais |

## Alteracoes Detalhadas

### 1. Mover isSubmitting (linha 213 -> linha 173)

Mover a declaracao para antes de `handleSubmit`:

```tsx
// Linha 173 (depois do useEffect)
const isSubmitting = createMutation.isPending || updateMutation.isPending;

const handleSubmit = (values: FormValues) => {
  // ...
};

// Remover a linha 213 antiga
```

### 2. Remover onSubmit do Form (linha 422)

Antes:
```tsx
<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
```

Depois:
```tsx
<form onSubmit={(e) => e.preventDefault()} className="space-y-6">
```

### 3. Botao Criar Orcamento (linha 507)

Antes:
```tsx
<Button type="submit" disabled={isSubmitting}>
```

Depois:
```tsx
<Button type="button" onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSubmitting}>
```

### 4. Botao Salvar no Modo Edicao (linha 523)

Antes:
```tsx
<Button type="submit" disabled={isSubmitting}>
```

Depois:
```tsx
<Button type="button" onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSubmitting}>
```

## Por Que Esta Solucao Funciona

1. **Previne TODA submissao automatica**: O `onSubmit={(e) => e.preventDefault()}` bloqueia qualquer tentativa de submit do navegador (Enter em inputs, etc.)

2. **Controle total**: A criacao/atualizacao SO acontece quando o usuario clica explicitamente no botao correto

3. **isSubmitting funciona**: Movendo a declaracao para antes do uso, a verificacao de duplo-click funciona corretamente

4. **Validacao preservada**: O `form.handleSubmit(handleSubmit)` ainda valida os campos antes de executar

## Validacao

1. Criar novo orcamento
2. Preencher campos da Etapa 1
3. Clicar em "Proximo" -> Deve ir para Etapa 2, NAO deve salvar
4. Pressionar Enter em qualquer campo -> NAO deve salvar
5. Clicar em "Criar Orcamento" -> Deve salvar
6. Verificar que APENAS UM orcamento foi criado

