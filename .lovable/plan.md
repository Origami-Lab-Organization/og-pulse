
# Plano: Corrigir Submit Acidental no Wizard de Funcionarios

## Problema Identificado

O formulário de cadastro de funcionário está sendo submetido prematuramente quando o usuário navega da etapa 3 (Benefícios) para a etapa 4 (Ferramentas). O sintoma é:
1. Usuário clica em "Próximo" na etapa 3
2. O sistema volta para a etapa 1
3. Após ~3 segundos, aparece mensagem de sucesso dizendo que o funcionário foi salvo

### Causa Raiz

O botão de navegação muda dinamicamente entre `type="button"` (etapas 1-3) e `type="submit"` (etapa 4) baseado na variável `isLastStep`. Quando o `currentStep` muda de 2 para 3, o React re-renderiza o componente e o botão passa a ter `type="submit"`. 

Há uma condição de corrida onde o evento de clique do botão "Próximo" pode propagar-se para o novo botão "Finalizar Cadastro" (que agora é `type="submit"`), disparando o submit do formulário.

---

## Solucao: Usar Apenas `type="button"` Para Todos os Botoes

A correção mais segura é **nunca usar `type="submit"` em botões dentro do form** e chamar manualmente o `handleSubmit` do react-hook-form.

### Arquivo a Modificar

`src/components/employees/EmployeeFormDialog.tsx`

### Alteracoes no Codigo

**Linha 1071-1084 - Botão "Finalizar Cadastro":**

```typescript
// DE:
{!isEditing && isLastStep ? (
  <Button type="submit" disabled={isLoading}>
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Salvando...
      </>
    ) : (
      <>
        <Check className="mr-2 h-4 w-4" />
        Finalizar Cadastro
      </>
    )}
  </Button>

// PARA:
{!isEditing && isLastStep ? (
  <Button 
    type="button" 
    disabled={isLoading}
    onClick={form.handleSubmit(handleSubmit)}
  >
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Salvando...
      </>
    ) : (
      <>
        <Check className="mr-2 h-4 w-4" />
        Finalizar Cadastro
      </>
    )}
  </Button>
```

**Linha 1091-1100 - Botão "Salvar Alterações" (modo edição):**

```typescript
// DE:
<Button type="submit" disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Salvando...
    </>
  ) : (
    'Salvar Alterações'
  )}
</Button>

// PARA:
<Button 
  type="button" 
  disabled={isLoading}
  onClick={form.handleSubmit(handleSubmit)}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Salvando...
    </>
  ) : (
    'Salvar Alterações'
  )}
</Button>
```

**Linha 1039 - Remover onSubmit do form:**

```typescript
// DE:
<form onSubmit={form.handleSubmit(handleSubmit)}>

// PARA:
<form onSubmit={(e) => e.preventDefault()}>
```

---

## Por Que Esta Solucao Funciona

1. **Todos os botões agora têm `type="button"`**: Elimina qualquer possibilidade de submit acidental por clique ou tecla Enter em inputs
2. **Submit é feito manualmente via `onClick`**: O `form.handleSubmit(handleSubmit)` só é chamado quando o usuário EXPLICITAMENTE clica em "Finalizar Cadastro" ou "Salvar Alterações"
3. **O form bloqueia submits nativos**: O `onSubmit={(e) => e.preventDefault()}` garante que mesmo se um submit nativo acontecer (ex: Enter em input), ele será bloqueado

---

## Resumo das Alteracoes

| Linha | Componente | Mudanca |
|-------|------------|---------|
| 1039 | `<form>` | Trocar `onSubmit` por `preventDefault` |
| 1072 | Botão "Finalizar Cadastro" | Mudar para `type="button"` + `onClick` |
| 1091 | Botão "Salvar Alterações" | Mudar para `type="button"` + `onClick` |

---

## Criterios de Aceite

1. Ao clicar em "Próximo" na etapa de Benefícios, o wizard avança para Ferramentas (etapa 4)
2. O wizard NÃO reseta para etapa 1
3. O funcionário NÃO é salvo até o usuário clicar em "Finalizar Cadastro" na etapa 4
4. Pressionar Enter em qualquer input NÃO submete o formulário
5. O botão "Salvar Alterações" (modo edição) continua funcionando normalmente
6. Validações do formulário continuam funcionando ao clicar em "Finalizar Cadastro"
