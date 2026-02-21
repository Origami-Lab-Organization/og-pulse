
## Simplificar selecao de contato no formulario de Lead

### Problema atual

Quando um stakeholder de projeto anterior e selecionado, os campos Contato, Email e Telefone continuam visiveis e repetem a mesma informacao, gerando redundancia visual.

### Solucao

Transformar a secao de contato em um fluxo unificado:

1. Quando o cliente existente for selecionado e houver stakeholders anteriores, exibir um unico dropdown com as opcoes:
   - Stakeholders encontrados (ex: "Angela Capellari -- Diretora Geral")
   - Opcao final: "+ Novo contato" para preencher manualmente

2. Quando um stakeholder for selecionado no dropdown, os campos Contato/Email/Telefone ficam **ocultos** (os valores sao preenchidos via `form.setValue` internamente, mas nao aparecem duplicados na tela)

3. Quando "+ Novo contato" for selecionado, os campos Contato/Email/Telefone voltam a aparecer vazios para preenchimento manual

4. Quando nao houver stakeholders anteriores ou o cliente for novo, os campos de contato aparecem normalmente (comportamento atual)

### Detalhes tecnicos

**Arquivo: `src/components/crm/LeadFormDialog.tsx`**

- Adicionar estado local `contactMode`: `'manual'` | `'stakeholder'` (default `'manual'`)
- Ao selecionar um stakeholder do dropdown, setar `contactMode = 'stakeholder'` e preencher os valores via `form.setValue`
- Ao selecionar "+ Novo contato", setar `contactMode = 'manual'`, limpar os campos de contato e exibir os inputs
- Condicionar a exibicao dos campos Contato/Email/Telefone: so aparecem quando `contactMode === 'manual'` ou quando nao ha stakeholders disponiveis
- Resetar `contactMode` para `'manual'` quando o `clientId` mudar (para nao manter estado stale)
