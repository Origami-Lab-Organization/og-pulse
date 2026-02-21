
# Enriquecer o Dialog de Detalhes do Lead com Dados Financeiros do Orcamento

## Resumo

Atualizar o `LeadDetailDialog` para exibir informacoes financeiras detalhadas do orcamento vinculado (custo total, preco de venda, valor final) e adicionar um botao para abrir a pagina completa do orcamento. Tambem expandir os campos retornados na query de leads para incluir os dados financeiros necessarios.

## Alteracoes

### 1. Expandir query de leads (`leadService.ts`)

Adicionar mais campos do budget na query select:
- `subtotal` (custo total)
- `total_with_fees` (preco de venda)
- `discount_value` (desconto)
- `duration_months`
- `start_date`
- `title`

### 2. Atualizar tipo `LeadWithBudget` (`types/lead.ts`)

Adicionar os novos campos ao tipo `budget` dentro de `LeadWithBudget`:
- `title`, `subtotal`, `total_with_fees`, `discount_value`, `duration_months`, `start_date`

### 3. Redesenhar `LeadDetailDialog.tsx`

Manter a estrutura atual (header com 3 pontinhos, footer com Editar/Fechar) mas enriquecer o corpo com:

**Secao de informacoes do lead** (igual ao atual):
- Empresa, Contato, Email, Telefone, Origem, Notas

**Secao financeira do orcamento** (nova):
- Badge do orcamento clicavel com numero
- Linha: Custo Total | Preco de Venda
- Linha: Desconto (se houver)
- Destaque: Valor Final em card com fundo primary/10
- Botao "Abrir Orcamento" que navega para `/budgets/{id}`

**Secao de etapa** (igual ao atual):
- Badge da etapa com a cor correspondente da coluna CRM

### Arquivos modificados
- **Editar**: `src/services/leadService.ts` (expandir select do budget)
- **Editar**: `src/types/lead.ts` (adicionar campos ao tipo budget)
- **Editar**: `src/components/crm/LeadDetailDialog.tsx` (adicionar secao financeira e botao abrir orcamento)
