

## Plano: Corrigir erro "client_id NOT NULL" ao fechar negócio

### Problema
O orçamento "Eficiência Operacional - Discovery" (Tecno2000) tem `client_id = NULL` no banco pois foi criado antes da correção que tornou o cliente obrigatório. Ao tentar fechar negócio, o `useCloseBusinessDeal` passa `clientId: undefined` → `projectService` converte para `null` → viola constraint NOT NULL da tabela `projects`.

### Solução

**`src/components/crm/CloseBusinessDialog.tsx`**
- Quando o budget existe mas NÃO tem `client_id`, exibir o campo de seleção de cliente (igual ao modo sem budget), para que o usuário associe um cliente antes de fechar
- Validar no schema que `clientId` é obrigatório quando no modo com budget sem cliente

**`src/hooks/useCloseBusinessDeal.ts`**
- Linha 80: trocar `clientId: budget.client_id || undefined` por `clientId: budget.client_id || input.clientId` — usar o `clientId` do formulário como fallback quando o budget não tem cliente
- Garantir que se `clientId` final for vazio, lançar erro antes de tentar inserir

### Detalhes da mudança no CloseBusinessDialog

No formulário, adicionar lógica: se `hasBudget && !budget.client_id`, mostrar o Select de cliente (reutilizando o mesmo bloco que já existe no modo sem budget). Isso permite que orçamentos antigos sem cliente sejam fechados normalmente.

No submit do `useCloseBusinessDeal`, o `clientId` virá do formulário quando o budget não tiver um.

### Arquivos alterados
- `src/components/crm/CloseBusinessDialog.tsx` — mostrar campo cliente quando budget não tem client_id
- `src/hooks/useCloseBusinessDeal.ts` — usar clientId do input como fallback

