# og-pulse MCP Prospecção

Servidor MCP que opera a **Prospecção** do Origami Pulse pelo chat (Claude Desktop, Claude Code
ou qualquer cliente MCP): buscar e cadastrar empresas e contatos, registrar atividades, mover
etapas e ler os números do funil.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `list_prospecting_options` | Etapas (e como se chega a cada uma), canais, alavancas, motivos de descarte e responsáveis válidos |
| `search_companies` | Busca empresas por parte do nome ou do CNPJ (com nº de contatos) |
| `check_company_duplicates` | Confere CNPJ, LinkedIn e nome idêntico antes de cadastrar, com a situação "Abordar / Não abordar" da tela Empresas |
| `get_company` | Ficha da empresa e todos os contatos dela |
| `create_company` | Cadastra empresa (valida CNPJ; avisa homônimo; o banco recusa CNPJ/LinkedIn duplicado) |
| `update_company` | Atualiza empresa — vale para todos os contatos dela |
| `list_contacts` | Lista contatos por empresa, nome, etapa, responsável e alavanca |
| `my_agenda` | Contatos com atividade vencida ou vencendo — "o que tenho para hoje" |
| `get_contact` | Ficha do contato (e-mail, telefone, redes) e últimas atividades |
| `create_contact` | Cadastra contato numa empresa existente, em "A abordar" |
| `create_contact_with_company` | Cadastra contato com `company_id` **ou** empresa nova; reaproveita a empresa já cadastrada (CNPJ → LinkedIn → nome) e não duplica contato de mesmo nome/e-mail |
| `update_contact` | Atualiza dados do contato (não muda etapa) |
| `register_activity` | Registra um toque com relato obrigatório; o banco conta, agenda e move a etapa |
| `move_contact_stage` | Move para etapa conduzida à mão (A abordar, Reunião agendada, Reunião feita, Oportunidade qualificada) |
| `discard_contact` | Descarta com motivo da lista fechada |
| `reopen_contact` | Reabre Descartado / Sem resposta em "A abordar" |
| `list_prospect_tasks` | Tarefas de um contato, ou as pendentes de uma pessoa em todos os contatos |
| `create_prospect_task` | Cria tarefa (texto + prazo); fica com o responsável do contato |
| `update_prospect_task` | Altera texto/prazo, conclui ou reabre a tarefa |
| `get_prospecting_metrics` | Funil, taxas e cobertura da lista num período; quebra por alavanca, anel, tier ou responsável |

**Prospecção ≠ Pipeline.** O servidor declara `instructions` para o cliente MCP: Prospecção é
contato frio (atenção conquistada, não receita); Pipeline é Oportunidade (receita), no
`og-pulse-drive`. Sem isso, "cadastra um contato de prospecção" virava `create_opportunity`.

**Duplicidade.** O nome só reaproveita empresa quando CNPJ e LinkedIn não a contradizem; com
mais de um homônimo indistinguível, a ferramenta para e pede o `company_id`. A regra está em
`src/duplicidade.ts`.

**Tarefa não é atividade.** Não conta toque, não agenda cadência e não move etapa — igual à
tela (migration `20260924120000_prospect_tasks`).

### O que fica de fora, de propósito

- **Converter em Oportunidade** — a conversão cria o `leads` pela regra de
  `convertProspectToLead`, que vive na aplicação. Expor aqui duplicaria essa escrita (TD-0022).
- **Excluir contato, apagar atividade e excluir tarefa** — irreversíveis; ficam na tela.
- **Anexos** — o upload depende do bucket e do fluxo de `src/lib/prospectAttachments.ts`.

## Uma regra, um lugar

O servidor não reimplementa regra de domínio:

- **Cadência e mudança de etapa por atividade** são do trigger `prospect_activities_advance`,
  no banco. O MCP só insere a linha, igual à tela.
- **Descartar e reabrir** montam a linha com `src/lib/prospecting/transitions.ts`, o mesmo
  módulo que `src/services/prospectService.ts` usa.
- **Etapas, rótulos, alavancas, motivos, canais e métricas** são importados de
  `src/types/prospect.ts`, `src/lib/interactionChannels.ts` e `src/lib/prospecting/metrics.ts`
  pelo alias `@/` (ver `tsconfig.json`). O esbuild resolve ao empacotar.

Só módulos **sem dependência de browser** podem entrar nesse grafo. Importar um service de
`src/services/` puxaria o client do Vite e quebraria o servidor no Node.

## Segurança

Opera **sob a RLS**, com as credenciais da própria pessoa e a chave publicável — nunca service
key. Sem `prospeccao:ler` não lê nada; sem `prospeccao:editar` não escreve nada. `tenant_id` e
autoria derivam da sessão, nunca de parâmetro de tool. A senha é lida do ambiente e não passa
pelo contexto do modelo; a sessão fica em `~/.og-pulse/prospeccao-session.json` (0600).

## Instalação

Quem usa o produto instala os três servidores do Pulse de uma vez:

```bash
curl -fsSL https://origamipulse.com.br/mcp/install.sh | bash
```

Para desenvolver a partir do repositório:

```bash
cd apps/mcp-prospeccao
npm install
cp .env.example .env   # preencha SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, PULSE_EMAIL, PULSE_PASSWORD
npm run dev            # tsx, sem build
npm run typecheck
```

O pacote distribuído é gerado por `scripts/build-mcp-bundles.sh` em `public/mcp/og-pulse-prospeccao.mjs`.

## Exemplos de pedidos

- "O que tenho de prospecção para fazer hoje?"
- "Já temos a Acme na prospecção? Quem são os contatos de lá?"
- "Cadastra a empresa Acme, CNPJ 11.222.333/0001-81, e a Maria Souza como contato, diretora de operações, WhatsApp (31) 99999-0000."
- "Registra que liguei para a Maria e ela pediu para retornar semana que vem."
- "A Maria respondeu o e-mail — registra com resposta."
- "Marca a reunião com a Maria como feita: falamos de automação do faturamento, próximo passo é proposta."
- "Descarta o João da Beta, contato errado."
- "Já temos a Beta Ltda, CNPJ 11.222.333/0001-81? Se não, cadastra com o João Lima, gerente comercial."
- "Cria uma tarefa para a Maria: mandar o material até sexta."
- "Quais tarefas de prospecção eu tenho vencendo esta semana?"
- "Como está o funil de prospecção nos últimos 30 dias, por alavanca?"
