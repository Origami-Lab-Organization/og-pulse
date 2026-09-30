# og-pulse MCP Prospecção

Servidor MCP que opera a **Prospecção** do Origami Pulse pelo chat (Claude Desktop, Claude Code
ou qualquer cliente MCP). Desde 28/09/2026 a Prospecção é o quadro comercial de ponta a ponta —
do primeiro toque ao **Ganho** ou **Perda** —, e este é o único servidor comercial: as
ferramentas de Oportunidade saíram do `og-pulse-drive` em 29/09/2026.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `list_prospecting_options` | Etapas (e como se chega a cada uma, inclusive Ganho e Perda), canais, alavancas, motivos de perda, períodos das métricas e responsáveis válidos |
| `search_companies` | Busca empresas por parte do nome ou do CNPJ (com nº de contatos) |
| `search_clients` | Busca clientes da carteira por nome ou CNPJ e diz se já têm empresa na Prospecção; o `client_id` liga a empresa ao cliente |
| `lookup_cnpj` | Consulta o CNPJ na Receita (BrasilAPI): regime tributário por ano (sinal de Lei do Bem), porte, situação, abertura, capital, CNAE, contatos de cadastro e sócios — não cadastra nada |
| `enrich_company_from_cnpj` | Grava na empresa já cadastrada os dados da Receita e a rede de sócios (reconsultar atualiza sem duplicar) |
| `update_company_partner` | Registra LinkedIn, Instagram e telefone de um sócio — só o que a pessoa confirmou |
| `promote_partner_to_contact` | Sócio vira contato em "A abordar", com cargo e redes |
| `check_company_duplicates` | Confere CNPJ, LinkedIn e nome idêntico antes de cadastrar, com a situação "Abordar / Não abordar" da tela Empresas |
| `get_company` | Ficha da empresa e todos os contatos dela |
| `create_company` | Cadastra empresa (valida CNPJ; avisa homônimo; o banco recusa CNPJ/LinkedIn duplicado). Com CNPJ, já grava os dados da Receita e os sócios |
| `update_company` | Atualiza empresa — vale para todos os contatos dela |
| `list_contacts` | Lista contatos por empresa, nome, etapa, responsável e alavanca |
| `my_agenda` | "O que tenho para hoje": tarefas pendentes até a data (o único aviso de vencimento do quadro) e toques sugeridos pela cadência |
| `get_contact` | Ficha do contato (e-mail, telefone, redes, valor estimado, ganho, perda), orçamento e projeto vinculados (só leitura) e últimas atividades |
| `create_contact` | Cadastra contato numa empresa existente, em "A abordar" |
| `create_contact_with_company` | Cadastra contato com `company_id` **ou** empresa nova; reaproveita a empresa já cadastrada (CNPJ → LinkedIn → nome) e não duplica contato de mesmo nome/e-mail |
| `update_contact` | Atualiza dados do contato, inclusive valor estimado, concorrente e observações (não muda etapa) |
| `register_activity` | Registra um toque com relato obrigatório; o banco conta, agenda e move a etapa. Cadência esgotada fica em "Em cadência" — nenhum desfecho é automático |
| `move_contact_stage` | Move para etapa conduzida à mão (A abordar, Reunião agendada, Reunião feita, Oportunidade qualificada), com a `data` do fato — é ela que conta nas métricas |
| `mark_contact_won` | Registra o **Ganho** (de Reunião feita em diante): data obrigatória, valor opcional; chamar de novo corrige |
| `undo_contact_win` | Desfaz o Ganho: volta para Oportunidade qualificada e apaga data e valor |
| `discard_contact` | Registra a **Perda**, de qualquer etapa, com motivo da lista fechada |
| `reopen_contact` | Reabre Perda (ou o antigo Sem resposta) em "A abordar" |
| `list_prospect_tasks` | Tarefas de um contato, ou as pendentes de uma pessoa em todos os contatos |
| `create_prospect_task` | Cria tarefa (texto + prazo); fica com o responsável do contato |
| `update_prospect_task` | Altera texto/prazo, conclui ou reabre a tarefa |
| `get_prospecting_metrics` | O mesmo cálculo da aba Métricas: números do período com variação, jornada dos ativados com taxas e gargalo, leituras, pendências, tempo de ciclo, perdas e valor ganho; quebra por alavanca ou responsável |

**Oportunidades absorvidas (29/09/2026).** O Pipeline de Oportunidades saiu do Pulse e cada
oportunidade virou contato aqui (migration `20260929120000_prospeccao_absorve_oportunidades`).
O contato ganhou `estimated_value`, `competitor_name` e observações (`observacoes` na tool,
`notes` no banco); orçamento e projeto passam a apontar para ele.

**Desfecho.** O servidor declara `instructions` para o cliente MCP: todo pedido comercial é
feito aqui, e cada contato termina em Ganho (`mark_contact_won`) ou Perda (`discard_contact`).
As regras dos dois moram no trigger `prospects_outcome_rules` (migration
`20260928200000_prospect_ganho_perda`): Ganho só de Reunião feita em diante, data obrigatória,
e sair do desfecho o limpa. O MCP só adianta a frase certa — quem recusa é o banco.

**Duplicidade.** O nome só reaproveita empresa quando CNPJ e LinkedIn não a contradizem; com
mais de um homônimo indistinguível, a ferramenta para e pede o `company_id`. A regra está em
`src/duplicidade.ts`.

**Tarefa não é atividade.** Não conta toque, não agenda cadência e não move etapa — igual à
tela (migration `20260924120000_prospect_tasks`).

### O que fica de fora, de propósito

- **Excluir contato, apagar atividade e excluir tarefa** — irreversíveis; ficam na tela.
- **Anexos** — o upload depende do bucket e do fluxo de `src/lib/prospectAttachments.ts`.

## Uma regra, um lugar

O servidor não reimplementa regra de domínio:

- **Cadência e mudança de etapa por atividade** são do trigger `prospect_activities_advance`,
  no banco. O MCP só insere a linha, igual à tela.
- **Descartar e reabrir** montam a linha com `src/lib/prospecting/transitions.ts`, o mesmo
  módulo que `src/services/prospectService.ts` usa.
- **Etapas, rótulos, alavancas, motivos, canais e métricas** são importados de
  `src/types/prospect.ts`, `src/lib/interactionChannels.ts` e `src/lib/prospecting/`
  (`periodMetrics.ts`, `metricsReadings.ts`, `milestones.ts`, `periods.ts`) pelo alias `@/`
  (ver `tsconfig.json`). O esbuild resolve ao empacotar. O texto das métricas mora em
  `src/metricas.ts` e só escolhe o que dizer: tela e chat dão o mesmo número.
- **Ganho e data da etapa** usam as mesmas RPCs da tela: `mark_prospect_won` e
  `set_prospect_stage` (`SECURITY INVOKER`, sob a RLS de quem chama).

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
- "A reunião com a Maria foi ontem: falamos de automação do faturamento, próximo passo é proposta."
- "Fechamos com a Maria: 48 mil, assinado hoje."
- "Perdemos o João da Beta: recusou a proposta pelo preço."
- "Já temos a Beta Ltda, CNPJ 11.222.333/0001-81? Se não, cadastra com o João Lima, gerente comercial."
- "Cria uma tarefa para a Maria: mandar o material até sexta."
- "Quais tarefas de prospecção eu tenho vencendo esta semana?"
- "Como está a prospecção nos últimos 30 dias, por alavanca? Onde está o gargalo?"
