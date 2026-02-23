

## Importar Stakeholders de Outros Projetos do Mesmo Cliente

### Objetivo

Ao adicionar stakeholders a um projeto, permitir que o usuario selecione stakeholders ja cadastrados em outros projetos do mesmo cliente. Ao importar, todos os dados do stakeholder (nome, cargo, papel, organizacao, email, telefone, influencia, interesse, patrocinio) sao copiados automaticamente, e o usuario precisa apenas definir a **acao** do stakeholder para o novo projeto.

### Experiencia do Usuario

1. Na aba Stakeholders, alem do botao "Novo Stakeholder", sera adicionado um botao "Importar do Cliente"
2. Ao clicar, abre um dialog listando todos os stakeholders cadastrados em outros projetos do mesmo cliente (excluindo os ja presentes no projeto atual)
3. O usuario seleciona um ou mais stakeholders da lista (com checkbox)
4. Para cada stakeholder selecionado, o usuario escolhe a "Acao" (manter satisfeito, manter informado, etc.)
5. Ao confirmar, os stakeholders sao criados no projeto atual com todos os dados copiados

### Etapas Tecnicas

**1. Novo hook `useClientStakeholders`**

Criar um hook que busca stakeholders de outros projetos do mesmo cliente:
- Query: buscar `project_stakeholders` onde `project_id` pertence a projetos com o mesmo `client_id`, excluindo o projeto atual
- Agrupar/deduzir por nome+email para evitar duplicatas entre projetos
- Filtrar stakeholders que ja existem no projeto atual

**2. Novo componente `ImportStakeholdersDialog`**

- Recebe `projectId` e `clientId` como props
- Lista os stakeholders disponiveis com nome, cargo, papel, organizacao
- Checkbox para selecao multipla
- Para cada selecionado, exibir dropdown de "Acao"
- Botao "Importar" que cria todos os stakeholders selecionados via `useCreateStakeholder`

**3. Atualizar `ProjectStakeholdersTab`**

- Adicionar botao "Importar do Cliente" ao lado de "Novo Stakeholder"
- Controlar estado de abertura do novo dialog
- Passar `clientId` do projeto para o dialog

### Arquivos a criar/modificar

- **Criar**: `src/components/projects/stakeholders/ImportStakeholdersDialog.tsx` - dialog de importacao
- **Criar**: `src/hooks/useClientStakeholders.ts` - hook para buscar stakeholders de outros projetos do cliente
- **Modificar**: `src/components/projects/detail/ProjectStakeholdersTab.tsx` - adicionar botao de importacao

### Detalhes tecnicos

**Query para buscar stakeholders do cliente (hook):**

```sql
-- Logica equivalente no Supabase JS:
-- 1. Buscar project_ids onde client_id = X e id != projetoAtual
-- 2. Buscar project_stakeholders desses projetos
-- 3. Deduzir por nome+email no frontend
```

```typescript
// useClientStakeholders.ts
const { data: clientProjects } = await supabase
  .from('projects')
  .select('id')
  .eq('client_id', clientId)
  .neq('id', currentProjectId);

const projectIds = clientProjects.map(p => p.id);

const { data: stakeholders } = await supabase
  .from('project_stakeholders')
  .select('*')
  .in('project_id', projectIds);
```

**Deduplicacao no frontend:** agrupar por `name + email`, pegando o registro mais recente de cada stakeholder unico.

**Importacao:** para cada stakeholder selecionado, chamar `useCreateStakeholder` com todos os dados copiados + a acao escolhida pelo usuario. O campo `notes` pode ser limpo ou copiado (copiar por padrao).

Nao sao necessarias alteracoes no banco de dados, pois a estrutura da tabela `project_stakeholders` ja comporta todos os dados necessarios.

