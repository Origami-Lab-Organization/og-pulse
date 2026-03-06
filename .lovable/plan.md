

## Plano: Obrigar criação de cliente ao criar orçamento para empresa não cadastrada

### Contexto
Atualmente, quando o tipo de cliente é "Novo Lead", o formulário de orçamento apenas coleta nome/email/telefone como texto livre, sem criar um registro de cliente no banco. Isso causa problemas downstream (ex: `client_id` vazio ao fechar negócio).

### Mudanças

**`src/pages/BudgetForm.tsx`**

1. **Remover a opção "Novo Lead"**: O radio group `clientType` com opções "Cliente Existente" / "Novo Lead" será substituído por um único Select de cliente + botão "Novo Cliente" ao lado.

2. **Adicionar botão "+ Novo Cliente"**: Ao lado do Select de cliente, um botão abre o `ClientFormDialog` existente para criar um novo cliente inline. Ao salvar com sucesso, o novo cliente é selecionado automaticamente no dropdown.

3. **Remover campos de lead**: Os campos `leadName`, `leadEmail`, `leadPhone` serão removidos do formulário e do schema Zod. O campo `clientId` passa a ser obrigatório (sem `.optional()`).

4. **Manter campo "Duração" visível**: O campo de duração que atualmente fica dentro do bloco de lead será movido para fora, sempre visível.

5. **Ajuste no submit**: Na submissão, sempre enviar `clientId`. Remover lógica de `leadName`/`leadContact`.

6. **Pre-fill de lead**: Quando vindo do CRM (`leadId`), se o lead tiver `client_id`, pré-selecionar o cliente. Se não tiver, abrir automaticamente o dialog de criação de cliente ou deixar o campo vazio para o usuário criar.

**Schema Zod atualizado:**
```typescript
const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  startDate: z.string().min(1),
  durationMonths: z.coerce.number().min(1).max(60),
  notes: z.string().optional(),
});
```

**`src/services/budgetService.ts`**
- Ajustar a criação para sempre usar `client_id` e remover `lead_name` / `lead_contact` do payload.

**`src/hooks/useCloseBusinessDeal.ts`**
- Linha 80: `clientId: budget.client_id || ''` → agora `budget.client_id` sempre existirá, mas manter fallback `|| null` por segurança.

### Arquivos alterados
- `src/pages/BudgetForm.tsx` (principal)
- `src/services/budgetService.ts` (remover lead fields do insert/update)
- `src/hooks/useCloseBusinessDeal.ts` (fix UUID vazio — converter `''` → `null`)

