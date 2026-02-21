
# Refatorar Interacao dos Cards de Lead no CRM

## Resumo

Substituir os botoes de editar/arquivar visíveis no card por um comportamento onde:
1. **Clicar no card** abre um dialog de detalhes do lead (com todas as informacoes e possibilidade de edicao)
2. **Menu de 3 pontinhos** no topo do dialog contem a opcao de arquivar (e outras acoes futuras)
3. Os botoes de Pencil e Archive sao removidos do card

## Alteracoes

### 1. Criar novo componente: `LeadDetailDialog.tsx`

Dialog modal que exibe os detalhes completos do lead:
- **Header**: Nome do lead + menu de 3 pontinhos (DropdownMenu) com opcao "Arquivar"
- **Corpo**: Informacoes do lead (empresa, contato, email, telefone, origem, notas)
- **Orcamento**: Se houver orcamento vinculado, exibir badge clicavel com numero e valor
- **Footer**: Botao "Editar" que abre o `LeadFormDialog` existente, e botao "Fechar"

O menu de 3 pontinhos (MoreVertical icon) tera:
- "Arquivar Lead" -- abre o `ArchiveLeadDialog` existente

### 2. Simplificar `LeadKanbanCard.tsx`

- Remover botoes de Pencil e Archive do card
- Remover props `onArchive` e `onEdit`
- Adicionar prop `onClick` para abrir o dialog de detalhes
- Manter apenas: nome, empresa, valor (se orcamento vinculado), badge do orcamento, icone de lock

### 3. Atualizar `LeadKanbanColumn.tsx`

- Remover props `onArchive` e `onEdit`
- Adicionar prop `onCardClick` para propagar o clique

### 4. Atualizar `LeadKanbanBoard.tsx`

- Adicionar estado para o `LeadDetailDialog` (open + lead selecionado)
- Passar `onCardClick` para as colunas
- Renderizar o `LeadDetailDialog`
- As acoes de editar e arquivar agora sao disparadas a partir do dialog de detalhes

## Detalhes tecnicos

### LeadDetailDialog - estrutura

```text
+----------------------------------------------+
| Nome do Lead                    [...]  [X]   |
+----------------------------------------------+
| Empresa: Bry Tecnologia S.A                  |
| Contato: Joao Silva                          |
| Email: joao@bry.com                          |
| Telefone: (48) 99999-0000                    |
| Origem: Indicacao                            |
| Observacoes: ...                             |
|                                              |
| Orcamento: [ORC-2026-0001]  R$ 40.800,00    |
| Etapa: Negocio Fechado                       |
|                                              |
+----------------------------------------------+
|                    [Editar]    [Fechar]       |
+----------------------------------------------+
```

O menu `[...]` (MoreVertical) contem:
- Arquivar Lead (abre ArchiveLeadDialog)

### Componentes reutilizados
- `ArchiveLeadDialog` -- sem alteracoes
- `LeadFormDialog` -- sem alteracoes (aberto pelo botao Editar do dialog de detalhes)

### Arquivos modificados
- **Criar**: `src/components/crm/LeadDetailDialog.tsx`
- **Editar**: `src/components/crm/LeadKanbanCard.tsx` (remover botoes, adicionar onClick)
- **Editar**: `src/components/crm/LeadKanbanColumn.tsx` (trocar props)
- **Editar**: `src/components/crm/LeadKanbanBoard.tsx` (adicionar estado do dialog de detalhes)
