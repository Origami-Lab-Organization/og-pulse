
# Plano: Corrigir Bug de Duplicacao de Orcamentos

## Problema Identificado

Apos investigacao detalhada do codigo, o problema NAO e a tecla Enter (que ja foi tratada). O problema e que **o formulario esta sendo submetido prematuramente quando o usuario clica no botao "Proximo"**, mesmo que este botao tenha `type="button"`.

### Causa Raiz

Analisando o codigo do `BudgetForm.tsx`, identifiquei que o problema esta na funcao `handleSubmit`:

```tsx
// Linha 174-199
const handleSubmit = (values: FormValues) => {
  // Cria o input e chama a mutation DIRETAMENTE
  // SEM verificar se estamos na ultima etapa!
  createMutation.mutate(input, { onSuccess: ... });
};
```

O `form.handleSubmit(handleSubmit)` esta no form (linha 410), e quando **qualquer submissao do form acontece** (seja por Enter, click em submit, ou comportamento inesperado do navegador), a funcao `handleSubmit` executa a criacao do orcamento.

### Problema com a Logica Atual

- O botao "Proximo" tem `type="button"` (linha 490), entao **nao deveria** disparar o submit
- POREM, se houver qualquer outro comportamento (ex: navegador interpretando Enter em input, propagacao de evento, etc.), o form pode ser submetido
- A funcao `handleSubmit` NAO verifica se o usuario esta na ultima etapa antes de salvar

## Solucao

### 1. Proteger a Funcao handleSubmit

Adicionar verificacao no inicio da funcao para **bloquear submissao se nao estiver na ultima etapa**:

```tsx
const handleSubmit = (values: FormValues) => {
  // PROTECAO: So permite salvar se estiver na ultima etapa (modo wizard)
  // ou se estiver em modo de edicao
  if (!isEditing && currentStep < WIZARD_STEPS.length) {
    console.warn('Form submission blocked: not on final step');
    return;
  }
  
  // Resto do codigo...
};
```

### 2. Prevenir Dupla Submissao

Adicionar verificacao para nao submeter se ja houver uma mutation em andamento:

```tsx
const handleSubmit = (values: FormValues) => {
  // PROTECAO: Bloquear se ja estiver submetendo
  if (isSubmitting) {
    return;
  }
  
  // PROTECAO: So permite salvar na ultima etapa
  if (!isEditing && currentStep < WIZARD_STEPS.length) {
    return;
  }
  
  // Resto do codigo...
};
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/BudgetForm.tsx` | Adicionar guards na funcao `handleSubmit` (linhas 174-199) |

## Implementacao Detalhada

### BudgetForm.tsx - Funcao handleSubmit (linhas 174-199)

**Antes:**
```tsx
const handleSubmit = (values: FormValues) => {
  const input: CreateBudgetInput = {
    title: values.title,
    // ... resto do input
  };

  if (isEditing && id) {
    updateMutation.mutate({ id, input }, { onSuccess: () => navigate('/budgets') });
  } else {
    createMutation.mutate(input, { onSuccess: () => navigate('/budgets') });
  }
};
```

**Depois:**
```tsx
const handleSubmit = (values: FormValues) => {
  // PROTECAO 1: Bloquear se ja estiver submetendo
  if (isSubmitting) {
    return;
  }
  
  // PROTECAO 2: No modo wizard, so permite salvar na ultima etapa
  if (!isEditing && currentStep < WIZARD_STEPS.length) {
    return;
  }

  const input: CreateBudgetInput = {
    title: values.title,
    // ... resto do input
  };

  if (isEditing && id) {
    updateMutation.mutate({ id, input }, { onSuccess: () => navigate('/budgets') });
  } else {
    createMutation.mutate(input, { onSuccess: () => navigate('/budgets') });
  }
};
```

## Por Que Esta Solucao Funciona

1. **Defesa em Profundidade**: Mesmo que algum comportamento inesperado dispare o submit do form, a funcao `handleSubmit` vai bloquear a criacao se nao estiver na ultima etapa.

2. **Previne Dupla Submissao**: Se o usuario clicar duas vezes rapido no botao "Criar Orcamento", a segunda chamada sera bloqueada porque `isSubmitting` ja sera `true`.

3. **Nao Afeta Modo de Edicao**: A verificacao de `currentStep` so se aplica ao modo de criacao (`!isEditing`).

## Validacao Apos Implementacao

1. **Teste de Criacao**:
   - Ir para Orcamentos > Novo Orcamento
   - Preencher os campos da Etapa 1
   - Clicar em "Proximo" -> Deve ir para Etapa 2, NAO deve salvar
   - Pressionar Enter em qualquer campo -> NAO deve salvar
   - Na Etapa 2, clicar em "Criar Orcamento" -> Deve salvar
   - Verificar que APENAS UM orcamento foi criado

2. **Teste de Edicao**:
   - Editar um orcamento existente
   - Alternar entre as abas
   - Clicar em "Salvar" -> Deve atualizar o orcamento

3. **Console**:
   - Se o submit for bloqueado prematuramente, deve aparecer um log de warning
