
# Redesenhar o Dialog de Lead como Formulario Editavel Inline com Auto-Save

## Resumo

Substituir o `LeadDetailDialog` atual (que exibe dados somente leitura + botao Editar que abre outro dialog) por um unico modal que:

1. Exibe os **mesmos campos editaveis** do formulario de criacao de lead (nome, tipo empresa, cliente/empresa, contato, email, telefone, origem, observacoes)
2. **Salva automaticamente** ao fechar o modal (clicar fora ou fechar)
3. **Nao tem botao X** de fechar no canto superior direito
4. Mantem o **menu de 3 pontinhos** com opcao de arquivar
5. Adiciona uma **secao financeira** do orcamento vinculado (valor total, desconto, margem, botao abrir orcamento)

## Detalhes tecnicos

### Arquivo: `src/components/crm/LeadDetailDialog.tsx` (reescrever)

O componente sera transformado em um formulario completo usando `react-hook-form` + `zod` (mesmo schema do `LeadFormDialog`), porem:

- **Sem botao X**: O `DialogContent` tera classe customizada para esconder o botao close nativo do Radix (`[&>button:last-child]:hidden` ou similar)
- **Auto-save no close**: Ao fechar o dialog (`onOpenChange(false)`), se o form estiver dirty (campos alterados), chama `updateLead.mutate()` automaticamente
- **Header**: Titulo "Editar Lead" + menu MoreVertical com "Arquivar Lead"
- **Corpo do formulario**: Identico ao `LeadFormDialog` -- Nome da Oportunidade, Radio de tipo empresa, Select de cliente ou Input de empresa, grid 2 colunas com contato/email e telefone/origem, textarea de observacoes
- **Secao financeira** (apos Separator, somente se houver budget vinculado):
  - Badge do orcamento clicavel
  - Grid com Valor Total e Desconto
  - Card destacado com Valor Final e duracao
  - Botao "Abrir Orcamento"
- **Footer**: Nenhum botao de Salvar/Fechar/Cancelar -- o save e automatico

### Arquivo: `src/components/crm/LeadFormDialog.tsx` (sem alteracao)

Continua existindo para criacao de novos leads. Nao sera alterado.

### Arquivo: `src/components/crm/LeadKanbanBoard.tsx` (sem alteracao)

Ja passa o `selectedLead` para o `LeadDetailDialog`, nao precisa mudar.

### Comportamento de auto-save

```text
Usuario clica no card
  -> Abre dialog com formulario preenchido
  -> Usuario edita campos
  -> Clica fora do modal (ou ESC)
  -> onOpenChange(false) dispara
  -> Se form.formState.isDirty: chama updateLead.mutate()
  -> Dialog fecha
```

### Estrutura visual do dialog

```text
+----------------------------------------------+
| Editar Lead                          [...]   |
+----------------------------------------------+
| Nome da Oportunidade *                       |
| [_________________________________]          |
|                                              |
| Tipo de Empresa:  (o) Existente  (o) Nova    |
| Cliente: [Dropdown_____________]             |
|                                              |
| Contato          | Email                     |
| [______________] | [______________]          |
|                                              |
| Telefone         | Origem                    |
| [______________] | [Dropdown_____]           |
|                                              |
| Observacoes                                  |
| [__________________________________]         |
|                                              |
| ------------------------------------------- |
| Orcamento                                    |
| [ORC-2026-0001]         Plataforma Bry       |
|                                              |
| Valor Total        Desconto                  |
| R$ 40.800,00       R$ 0,00                   |
|                                              |
| +------------------------------------------+|
| | Valor Final              3 meses         ||
| | R$ 40.800,00                             ||
| +------------------------------------------+|
|                                              |
| [       Abrir Orcamento       ]              |
+----------------------------------------------+
```

### Arquivos modificados
- **Reescrever**: `src/components/crm/LeadDetailDialog.tsx`
- Nenhum outro arquivo precisa ser alterado
