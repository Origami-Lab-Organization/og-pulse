
## Corrigir auto-save ao fechar o detalhe do Lead

### Problema

O `form.formState.isDirty` do react-hook-form nao esta sendo rastreado corretamente porque so e lido dentro de um callback (`handleOpenChange`), e nao durante a renderizacao do componente. O proxy do react-hook-form exige que propriedades do `formState` sejam acessadas durante o render para que as mudancas sejam assinadas e atualizadas.

### Solucao

**Arquivo: `src/components/crm/LeadDetailDialog.tsx`**

1. Desestruturar `isDirty` de `form.formState` no nivel do componente (durante o render) para que o proxy do react-hook-form rastreie essa propriedade corretamente
2. Usar a variavel `isDirty` dentro do `handleOpenChange` em vez de `form.formState.isDirty`

### Detalhes tecnicos

O react-hook-form usa um proxy para `formState`. Propriedades so sao "assinadas" quando lidas durante a renderizacao. Acessar `form.formState.isDirty` apenas dentro de um callback (como `handleOpenChange`) pode resultar em um valor sempre `false`, pois o proxy nao sabe que precisa notificar o componente sobre mudancas nessa propriedade.

A correção e adicionar no corpo do componente:
```tsx
const { isDirty } = form.formState;
```

E alterar `handleOpenChange` para:
```tsx
if (!newOpen && lead && isDirty) {
```

Isso faz com que o componente re-renderize quando `isDirty` muda, e a variavel estara sempre atualizada quando o callback for invocado.
