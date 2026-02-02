

# Plano: Ajustes Finais na Navegação do Orçamento

## Problemas Identificados

1. **Botão "Voltar" no topo desnecessário**: Atualmente existe um botão "Voltar" no header (linha 566-571) que deve ser removido.

2. **Botões de navegação não fixos**: Os botões "Anterior/Cancelar" e "Próximo/Salvar" estão dentro do fluxo do conteúdo e não fixos no rodapé.

3. **Scroll não reseta ao mudar de etapa**: Quando o usuário muda de etapa, o scroll permanece na posição anterior.

## Alterações Propostas

### 1. Remover botão "Voltar" do header

Na linha 566-571, remover o prop `actions` do `AppLayout`:

```tsx
// De:
<AppLayout
  title={...}
  description={...}
  breadcrumbs={...}
  actions={
    <Button variant="outline" onClick={() => navigate('/budgets')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  }
>

// Para:
<AppLayout
  title={...}
  description={...}
  breadcrumbs={...}
>
```

### 2. Scroll para o topo ao mudar de etapa

Adicionar `window.scrollTo(0, 0)` nas funções `handleNext` e `handlePrevious`:

```tsx
const handleNext = async () => {
  const isValid = await validateCurrentStep();
  if (isValid && currentStep < WIZARD_STEPS.length) {
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handlePrevious = () => {
  if (currentStep > 1) {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
```

### 3. Botões fixos no rodapé

Reestruturar o layout para ter um rodapé fixo. Alterar a estrutura do wizard (linhas 646-670):

```tsx
{/* Wizard navigation - fixed footer */}
<div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 ml-[var(--sidebar-width,0px)]">
  <div className="max-w-5xl mx-auto flex justify-between gap-2">
    {currentStep === 1 ? (
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate('/budgets')}
      >
        Cancelar
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        onClick={handlePrevious}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Anterior
      </Button>
    )}

    {currentStep < WIZARD_STEPS.length ? (
      <Button type="button" onClick={handleNext}>
        Próximo
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    ) : (
      <Button type="button" onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Save className="mr-2 h-4 w-4" />
        Criar Orçamento
      </Button>
    )}
  </div>
</div>
```

### 4. Adicionar padding inferior no conteúdo

Para compensar o rodapé fixo, adicionar espaço no final do conteúdo:

```tsx
{/* Current step content */}
<div className="mt-6 pb-24">
  {renderStepContent(currentStep)}
</div>
```

## Resumo das Mudanças

| Local | Alteração |
|-------|-----------|
| Linha 566-571 | Remover prop `actions` do AppLayout |
| Função `handleNext` (linha 226-231) | Adicionar scroll to top |
| Função `handlePrevious` (linha 233-237) | Adicionar scroll to top |
| Linha 642-644 | Adicionar `pb-24` para padding inferior |
| Linha 646-670 | Reestruturar navegação com rodapé fixo e lógica Cancelar/Anterior |

## Comportamento Esperado

| Etapa | Botão Esquerdo | Botão Direito |
|-------|----------------|---------------|
| 1 | Cancelar → vai para /budgets | Próximo |
| 2 | Anterior | Próximo |
| 3 | Anterior | Criar Orçamento |

## Arquivo a Modificar

- `src/pages/BudgetForm.tsx`

