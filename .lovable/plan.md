

## Corrigir erro de data e logica de projetos Ventures

### Problema 1: Erro "invalid input syntax for type date"

Ao salvar o projeto, o campo `first_invoice_date` envia uma string vazia `""` para o banco quando deveria enviar `null`. Isso causa o erro do Postgres.

### Problema 2: Projetos Ventures nao precisam de data de renovacao

Projetos de "Ventures" nao possuem data de renovacao, pois sao investimentos e nao contratos recorrentes. Quando a linha de servico for "ventures", o campo "Projeto Continuo" nao deve ser exigido nem a data de renovacao.

### Alteracoes

**Arquivo: `src/services/projectService.ts`**

- Na funcao `update`, tratar `firstInvoiceDate` vazia como `null`:
  - Linha ~230: `updateData.first_invoice_date = updates.firstInvoiceDate || null;`
- Mesmo tratamento para outros campos de data opcionais que podem chegar como string vazia (`renewalDate`, `endDate`, `contractUrl`)

**Arquivo: `src/components/projects/ProjectFormDialog.tsx`**

- No `handleSubmit`, garantir que `firstInvoiceDate` envia `undefined` em vez de `""`:
  - `firstInvoiceDate: values.firstInvoiceDate || undefined`
- Para projetos Ventures (`serviceLine === 'ventures'`):
  - Desmarcar automaticamente "Projeto Continuo" quando Ventures for selecionado (ou esconder o checkbox)
  - Nao exigir data de renovacao
- Ajustar o schema de validacao para nao exigir `renewalDate` quando a linha de servico for "ventures"

### Detalhes tecnicos

No `handleSubmit` (linha ~150-171):

```typescript
firstInvoiceDate: values.firstInvoiceDate || undefined,
renewalDate: values.isContinuous && values.serviceLine !== 'ventures' 
  ? values.renewalDate 
  : undefined,
```

No schema zod (linha ~63-68), ajustar o refine de `renewalDate`:

```typescript
.refine((data) => !data.isContinuous || data.serviceLine === 'ventures' || (data.renewalDate && data.renewalDate.length > 0), {
  message: 'Data de renovacao e obrigatoria para projetos continuos',
  path: ['renewalDate'],
})
```

No template, esconder o campo de renovacao quando for Ventures:

```typescript
{isContinuous && watchedServiceLine !== 'ventures' ? (
  // Campo de Data de Renovacao
) : !isContinuous ? (
  // Campo de Data de Fim
) : null}
```

No `projectService.ts` update (linha ~230):

```typescript
if (updates.firstInvoiceDate !== undefined) updateData.first_invoice_date = updates.firstInvoiceDate || null;
```

