# og-pulse MCP Activities Server

Servidor MCP (Model Context Protocol) que permite gerenciar o kanban de atividades do **Origami Pulse** conversacionalmente via Claude Desktop ou qualquer cliente MCP compatível.

---

## Ferramentas disponíveis

| Ferramenta | Descrição |
|---|---|
| `list_project_cards` | Lista cards ativos com filtros opcionais |
| `get_card_details` | Detalhes completos de um card (user story, tarefas, histórico) |
| `create_card` | Cria um novo card no kanban |
| `update_card` | Atualiza campos de um card existente |
| `move_card` | Avança ou retrocede um card no kanban (com validações) |
| `block_card` | Registra um bloqueio/impedimento num card |
| `unblock_card` | Remove o bloqueio de um card |
| `archive_card` | Arquiva um card (soft delete reversível) |
| `get_sprint_status` | Resumo completo da sprint ativa |
| `list_sprints` | Lista todas as sprints de um projeto |
| `assign_card_to_sprint` | Associa ou remove um card de uma sprint |

### Regras de negócio em `move_card`

- **Ordem das colunas:** `Product Backlog → Sprint Backlog → In Dev → In Test → In Deploy → Done`
- **Cards bloqueados** não podem avançar — é necessário desbloquear primeiro
- **WIP limits** são validados ao entrar em `in_dev`, `in_test` e `in_deploy`:
  - Limites padrão: In Dev = 5, In Test = 5, In Deploy = 3
  - Overrides configuráveis em `project_activity_settings` por projeto
- Cards arquivados não podem ser movidos

---

## Instalação

**Quem só usa o produto não precisa deste repositório.** O Pulse serve o instalador e os
dois servidores já empacotados, e a instalação é uma linha:

```bash
curl -fsSL https://origamipulse.com.br/mcp/install.sh | bash
```

O instalador confere o Node, baixa os pacotes, pergunta as credenciais, valida antes de
gravar configuração e registra nos dois clientes sem apagar outros MCPs. Ver
`scripts/build-mcp-bundles.sh` (empacotamento, roda no build) e `public/mcp/install.sh`.

O que segue abaixo é a instalação **a partir do repositório**, que compila do código local —
o caminho de quem desenvolve.


```bash
cd apps/mcp-activities
npm install
```

## Configuração

```bash
cp .env.example .env
# Edite .env com suas credenciais Supabase
```

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # a mesma chave do bundle do frontend
PULSE_EMAIL=voce@origamilab.com.br            # credenciais de quem opera o MCP
PULSE_PASSWORD=...
```

> **Este servidor opera SOB A RLS.** Ele entra com as credenciais da própria pessoa, então
> enxerga e altera exatamente o que ela enxergaria e alteraria no Pulse — nada além.
>
> Antes usava `SUPABASE_SERVICE_KEY`, que bypassa a RLS e, com ela, o `tenant_id`: um LLM
> no volante conseguia ler e escrever o kanban de **qualquer** tenant, e nenhuma capacidade
> do ADR-0027 o alcançava, porque a RLS é a barreira. Ver TD-0015.
>
> Consequência para quem usa: `tenant_id` e autoria (`created_by`, `changed_by`,
> `archived_by`) **não são mais parâmetros das tools**. Vinham do modelo, que podia apontar
> outro tenant ou atribuir a mudança a outra pessoa. Agora derivam da sessão.
>
> A senha é lida do ambiente uma vez e nunca passa pelo contexto do modelo. A sessão fica
> em `~/.og-pulse/activities-session.json`, com permissão 0600.

## Build e execução

```bash
# Desenvolvimento (tsx — sem build)
npm run dev

# Build TypeScript
npm run build

# Produção
npm start
```

---

## Configuração no Claude Desktop

Adicione em `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "og-pulse-activities": {
      "command": "node",
      "args": ["/caminho/para/og-pulse/apps/mcp-activities/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxxx.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
        "PULSE_EMAIL": "voce@origamilab.com.br",
        "PULSE_PASSWORD": "..."
      }
    }
  }
}
```

Para desenvolvimento com tsx (sem build):

```json
{
  "mcpServers": {
    "og-pulse-activities": {
      "command": "npx",
      "args": ["tsx", "/caminho/para/og-pulse/apps/mcp-activities/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://xxxx.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
        "PULSE_EMAIL": "voce@origamilab.com.br",
        "PULSE_PASSWORD": "..."
      }
    }
  }
}
```

---

## Exemplos de prompts

### 1. Visão geral do board
```
Quais cards estão no board do projeto <project_id>? Agrupa por coluna.
```

### 2. Cards bloqueados
```
Quais cards estão bloqueados no projeto <project_id>? Me diz o motivo de cada um.
```

### 3. Criar um card
```
Cria um card de bug no projeto <project_id> com o título "Login falha ao usar SSO"
e atribui para o employee <employee_id>.
```

### 4. Mover um card
```
Avança o card <card_id> para a próxima coluna.
```

### 5. Status da sprint
```
Qual o status da sprint atual do projeto <project_id>?
Quantos pontos já foram entregues?
```

### 6. Registrar bloqueio
```
O card <card_id> está impedido — o ambiente de homologação está fora do ar.
Registra esse bloqueio.
```

### 7. Planejar sprint
```
Liste as sprints planejadas do projeto <project_id> e associe os cards
<id1>, <id2>, <id3> à próxima sprint.
```

### 8. Revisar histórico de um card
```
Me mostra o histórico completo do card <card_id>: o que foi alterado,
quando e por quem.
```

### 9. Arquivar cards duplicados
```
Arquiva o card <card_id> — é uma duplicata do card #42.
```

### 10. Resumo de fim de sprint
```
A sprint <sprint_id> acabou. Me diz quantos pontos foram entregues,
quais cards ficaram em aberto e se havia bloqueios não resolvidos.
```

---

## Isolamento multi-tenant

Todas as queries filtram por `project_id` (que pertence a um único `tenant_id`).  
As ferramentas de escrita (`create_card`, `block_card`, `archive_card`) recebem `tenant_id` e `created_by`/`changed_by` explícitos — a identidade do usuário fica registrada no histórico de auditoria exatamente como no frontend.
