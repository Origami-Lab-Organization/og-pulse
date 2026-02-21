

## Adicionar campo "Responsavel" editavel no detalhe do Lead

O dialog de edicao do lead (`LeadDetailDialog`) nao possui o campo "Responsavel". Precisa ser adicionado para permitir alterar quem e o responsavel pelo lead.

### Alteracoes necessarias

**Arquivo: `src/components/crm/LeadDetailDialog.tsx`**

1. Importar `useEmployees` e `formatPhone` (mascara de telefone tambem esta faltando no detalhe)
2. Adicionar `responsible_id` ao schema Zod
3. Adicionar `responsible_id` aos `defaultValues` e ao `form.reset()` no useEffect
4. Adicionar `responsible_id` ao payload de auto-save no `handleOpenChange`
5. Adicionar o campo Select de "Responsavel" no formulario, logo apos "Linha de Servico", com a lista de funcionarios ativos

### Detalhes tecnicos

- O campo usara `useEmployees()` para listar funcionarios ativos (mesmo padrao do `LeadFormDialog`)
- O campo sera pre-preenchido com o `responsible_id` atual do lead
- Ao fechar o dialog, se o campo foi alterado, o novo `responsible_id` sera salvo automaticamente junto com os demais campos
- Tambem sera adicionada a mascara de telefone (`formatPhone`) no campo de telefone do detalhe, que estava faltando
