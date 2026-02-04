
# Plano: Adicionar Data de Início e Data de Fim no Dialog "Fechar Negócio"

## Contexto

Atualmente, quando o usuário move um orçamento para "Negócio Fechado", o dialog `CloseBusinessDialog` coleta:
- Gerente do Projeto
- Forma de Pagamento
- Parcelas
- Data Primeira NF
- Dia de Vencimento

O sistema calcula automaticamente a data de fim do projeto baseado no `start_date` do orçamento + `duration_months`, mas o usuário não pode visualizar nem editar essas datas.

## Requisito

1. Adicionar campos **Data de Início** e **Data de Fim** no formulário
2. **Data de Início**: pré-preenchida com a `start_date` do orçamento, editável pelo usuário
3. **Data de Fim**: calculada automaticamente (Data de Início + duração do orçamento em meses), editável pelo usuário
4. Quando a **Data de Início** mudar, recalcular a **Data de Fim** automaticamente (mantendo a duração)

---

## Implementação

### 1. Atualizar Schema do Formulário

**Arquivo:** `src/components/crm/CloseBusinessDialog.tsx`

Adicionar campos no schema Zod:

```typescript
const closeBusinessSchema = z.object({
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1, 'Mínimo de 1 parcela'),
  dueDay: z.coerce.number().min(1).max(31).default(10),
  firstInvoiceDate: z.string().min(1, 'Data da primeira NF é obrigatória'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),    // NOVO
  endDate: z.string().min(1, 'Data de fim é obrigatória'),          // NOVO
});
```

### 2. Adicionar Lógica de Recálculo Automático

Quando o usuário alterar a `startDate`, recalcular a `endDate` automaticamente:

```typescript
const startDateValue = form.watch('startDate');

useEffect(() => {
  if (startDateValue && budget) {
    const newEndDate = addMonths(new Date(startDateValue), budget.duration_months);
    form.setValue('endDate', newEndDate.toISOString().split('T')[0]);
  }
}, [startDateValue, budget, form]);
```

### 3. Adicionar Campos no Formulário

Inserir antes do grid de "Forma de Pagamento":

```tsx
<div className="grid grid-cols-2 gap-4">
  <FormField
    control={form.control}
    name="startDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Data de Início *</FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="endDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Data de Fim *</FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

### 4. Atualizar Interface de Callback

**Arquivo:** `src/components/crm/CloseBusinessDialog.tsx`

Atualizar o tipo `CloseBusinessFormValues` (automático pelo Zod).

### 5. Atualizar o Hook useCloseBusinessDeal

**Arquivo:** `src/hooks/useCloseBusinessDeal.ts`

Receber as datas do formulário em vez de calcular:

```typescript
interface CloseBusinessInput {
  budget: BudgetWithDetails;
  managerId: string;
  paymentMethod: string;
  installmentsCount: number;
  dueDay: number;
  firstInvoiceDate: string;
  startDate: string;     // NOVO
  endDate: string;       // NOVO
}

// Usar diretamente as datas recebidas
const project = await projectService.create({
  startDate: input.startDate,  // Usar do formulário
  endDate: input.endDate,      // Usar do formulário
  // ... resto
});
```

### 6. Atualizar KanbanBoard

**Arquivo:** `src/components/crm/KanbanBoard.tsx`

Atualizar o tipo do callback `handleCloseBusinessConfirm` para incluir as novas datas:

```typescript
const handleCloseBusinessConfirm = (formData: {
  managerId: string;
  paymentMethod: string;
  installmentsCount: number;
  dueDay: number;
  firstInvoiceDate: string;
  startDate: string;       // NOVO
  endDate: string;         // NOVO
}) => {
  // ...
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/crm/CloseBusinessDialog.tsx` | Adicionar campos `startDate` e `endDate` no schema e formulário, com recálculo automático |
| `src/hooks/useCloseBusinessDeal.ts` | Receber `startDate` e `endDate` como parâmetros em vez de calcular |
| `src/components/crm/KanbanBoard.tsx` | Atualizar tipo do callback para incluir novas datas |

---

## Comportamento Esperado

1. Usuário arrasta orçamento para "Negócio Fechado"
2. Dialog abre com:
   - **Data de Início**: pré-preenchida com `budget.start_date`
   - **Data de Fim**: calculada automaticamente (`start_date + duration_months`)
3. Se usuário alterar **Data de Início**, a **Data de Fim** é recalculada automaticamente
4. Usuário pode editar manualmente a **Data de Fim** se necessário
5. Ao confirmar, o projeto é criado com as datas definidas pelo usuário

---

## Layout Visual Atualizado

```
┌─ Fechar Negócio ────────────────────────────────────────────┐
│                                                              │
│  [Resumo do Orçamento - já existente]                       │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Complete as informações abaixo para criar o projeto:       │
│                                                              │
│  Gerente do Projeto *                                       │
│  [Selecione o gerente                              ▼]       │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Data de Início *     │  │ Data de Fim *        │        │ <- NOVO
│  │ [01/12/2025]         │  │ [01/06/2026]         │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Forma de Pagamento   │  │ Parcelas             │        │
│  │ [Mensal          ▼]  │  │ [6]                  │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Data Primeira NF *   │  │ Dia de Vencimento    │        │
│  │ [01/01/2026]         │  │ [10]                 │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│                    [Cancelar] [Confirmar e Criar Projeto]   │
└──────────────────────────────────────────────────────────────┘
```
