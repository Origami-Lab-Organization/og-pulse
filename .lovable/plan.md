

## Plano: Corrigir botão "Criar Orçamento" que não funciona

### Diagnóstico

O problema está na linha 673 do `BudgetForm.tsx`:

```typescript
onSubmit={() => form.handleSubmit(handleSubmit)()}
```

Quando o usuário clica "Criar Orçamento" no passo 3, o `form.handleSubmit` executa a validação completa do formulário (todos os campos, incluindo os do passo 1). Se a validação do Zod falhar (por exemplo, o refine que verifica `clientId` ou `leadName`), o `handleSubmit` **nunca é chamado** e nenhum erro é mostrado ao usuário -- o botão simplesmente "não faz nada".

Possíveis causas da validação falhando silenciosamente:
- O campo `clientId` pode estar vazio mesmo após selecionar um cliente (problema de binding do Select)
- O refine do schema pode estar falhando sem feedback visual

### Correção

**`src/pages/BudgetForm.tsx`**

1. Adicionar um callback de erro no `form.handleSubmit` para logar e mostrar feedback quando a validação falha:

```typescript
// Linha 673 - trocar:
onSubmit={() => form.handleSubmit(handleSubmit)()}

// Por:
onSubmit={() => form.handleSubmit(handleSubmit, (errors) => {
  console.error('Form validation errors:', errors);
  toast({
    title: 'Erro de validação',
    description: 'Verifique os campos obrigatórios no passo 1.',
    variant: 'destructive',
  });
})()}
```

2. Importar `useToast` no componente (se ainda não importado) e instanciar `const { toast } = useToast()`.

3. Aplicar a mesma correção na linha 684 (botão de salvar no modo edição).

### Arquivo alterado
- `src/pages/BudgetForm.tsx`

