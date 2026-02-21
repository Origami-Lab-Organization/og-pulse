
# Reestruturacao do CRM com Leads (sem duplicidade de dados)

**STATUS: IMPLEMENTADO**

## Resumo

CRM reestruturado de kanban baseado em orcamentos para kanban baseado em **leads** com 5 colunas. Dados do lead sao reaproveitados ao criar orcamento (zero redigitacao).

## Implementado

- Tabela `leads` com RLS (admins/managers CRUD, users SELECT)
- 5 colunas: Triagem, Qualificacao, Proposta, Negociacao, Negocio Fechado
- Drag-and-drop com regras de movimentacao
- Botao "Criar Orcamento" visivel a partir da coluna Proposta
- Pre-preenchimento do formulario de orcamento com dados do lead (campos somente-leitura)
- Vinculo automatico budget_id no lead apos salvar orcamento
- Redirecionamento para /crm apos salvar orcamento de lead
- Dialog de arquivamento com motivos pre-definidos + texto livre
- Dialog de edicao de lead
- CloseBusinessDialog integrado (requer orcamento vinculado)
- Compatibilidade total com pagina /budgets existente
