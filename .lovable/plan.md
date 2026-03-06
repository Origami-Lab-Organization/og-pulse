

## Plano: Remover validade e separar contato do lead em email/telefone

### Mudanças

**1. `src/pages/BudgetForm.tsx`**

- **Remover campos de validade**: Eliminar os campos "Válido de" (`startDate`) e "Válido até" (`validUntil`) do formulário. O `startDate` será preenchido automaticamente com a data atual (mantido no schema mas escondido do usuário). Remover `validUntil` do schema e do form.
- **Separar contato em dois campos**: Substituir o campo único `leadContact` por dois campos: `leadEmail` (Email do Lead) e `leadPhone` (Telefone do Lead). Na submissão, concatenar os dois em `leadContact` para manter compatibilidade com o banco (formato "email / telefone").
- **Pre-fill do lead**: Ajustar o `useEffect` que preenche dados do lead para popular `leadEmail` e `leadPhone` separadamente a partir de `leadData.contact_email` e `leadData.contact_phone`.
- **Layout**: O grid de "Nome do Lead" + contatos passa a ter 3 colunas: Nome, Email, Telefone. A linha de duração fica sozinha (1 coluna).

**2. Schema Zod (dentro de `BudgetForm.tsx`)**
- Remover `validUntil` do schema
- Trocar `leadContact` por `leadEmail` e `leadPhone` (ambos opcionais)
- Manter `startDate` no schema com default automático (não exibido)

### Arquivos alterados
- `src/pages/BudgetForm.tsx`

### Sem mudanças no banco
O campo `lead_contact` no banco continua como texto livre -- apenas concatenamos "email / telefone" antes de salvar.

