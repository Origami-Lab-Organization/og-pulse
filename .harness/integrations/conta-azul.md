# Integração: Conta Azul (API v2)

- Status: **partes 1 a 4 no código** — conexão, espelho, ligação de centros e Financeiro ›
  Conciliação (A receber, Fora dos projetos, A pagar por centro e por categoria).
- Decisão de arquitetura: [ADR-0044](../adr/0044-integracao-conta-azul-conexao-por-empresa-e-conciliacao.md).
- Direção: **só leitura** nesta fase (conciliação). Escrita é fase 2.
- Documentação oficial: https://developers.contaazul.com — consultada em 01/10/2026. Os specs
  OpenAPI brutos ficam em `https://developers.contaazul.com/_spec/...` (financeiro:
  `/_spec/docs/financial-apis-openapi.yaml`; pessoas:
  `/_spec/open-api-docs/open-api-person.yaml`; notas:
  `/_spec/open-api-docs/open-api-invoice.yaml`).
- Suporte: só pelo chat do Portal do Desenvolvedor (o e-mail foi descontinuado em jan/2026).

Legenda: **(confirmado)** = está na documentação; **(a validar)** = inferência ou lacuna da
documentação, precisa ser provado na conta de desenvolvimento antes de confiar.

## O que existe hoje (parte 1)

Fluxo: **Configurações › Integrações** (`/admin/integracoes`, `integracoes:gerir`) →
`conta-azul-connect` grava um `state` de uso único (10 min) e devolve a URL de autorização →
a pessoa autoriza no Conta Azul → o Conta Azul volta para
`https://origamipulse.com.br/admin/integracoes/conta-azul/retorno?code&state` →
`conta-azul-callback` consome o `state`, troca o código, lê a empresa conectada e grava a
conexão e o token cifrado. `conta-azul-disconnect` revoga no Conta Azul e apaga a conexão.

| Peça | Onde |
|---|---|
| Tabelas | `conta_azul_connections` (lida sob RLS), `conta_azul_tokens` e `conta_azul_oauth_states` (sem policy) — migration `20261001120000` |
| Adaptador (só leitura + OAuth) | `supabase/functions/_shared/contaAzul.ts` |
| Cifra do token | `supabase/functions/_shared/cifra.ts` (AES-256-GCM) |
| Ciclo do token e trava | `supabase/functions/_shared/contaAzulConexao.ts` + RPC `conta_azul_claim_refresh` |
| Tela | `src/components/integrations/ContaAzulCard.tsx`, `src/pages/ContaAzulRetorno.tsx` |

**Secrets das Edge Functions** (nenhum vai para o front nem para o repositório):

| Secret | O que é |
|---|---|
| `CONTA_AZUL_CLIENT_ID` / `CONTA_AZUL_CLIENT_SECRET` | credenciais do app de produção do Pulse no portal do Conta Azul |
| `CONTA_AZUL_REDIRECT_URI` | `https://origamipulse.com.br/admin/integracoes/conta-azul/retorno` — idêntica à cadastrada no app |
| `CONTA_AZUL_TOKEN_KEY` | chave AES de 32 bytes em base64 (`openssl rand -base64 32`). Trocar a chave invalida todos os tokens guardados: todas as empresas precisam conectar de novo |

Sem esses secrets as funções respondem 503 com "A integração com o Conta Azul ainda não está
configurada no Pulse", e o resto do app segue normal.

## Sincronização (parte 2)

`conta-azul-sync` roda pelo cron a cada 15 min (todas as conexões ativas, Bearer da service
role) e pelo "Sincronizar agora" (só a da empresa). Responde 202 e trabalha em segundo plano,
até ~110 s por execução; a próxima continua de onde parou. Trava por conexão
(`conta_azul_claim_sync`) impede cron e botão juntos.

| Ritmo | Como | Cursor |
|---|---|---|
| Carga inicial | `buscar` por mês de vencimento, desde 1º/jan do ano anterior à conexão (Origami: 01/01/2025) até 12 meses à frente | `backfill_cursor` (próximo mês); `backfill_done_at` ao terminar |
| Incremental | `buscar` com `data_alteracao_de/ate` desde o cursor − 10 min, uma janela de vencimento por ano | `incremental_cursor` (gravado no começo da carga inicial) |
| Varredura diária | relista a janela inteira, refaz o que faltou e marca `removed_at` no que sumiu — só se a janela inteira coube na execução | `last_full_scan_at` |

Por item listado, só relê o detalhe (`/parcelas/{id}`) se `data_alteracao` é mais nova que a
gravada. O CNPJ da pessoa vem de `/v1/pessoas/{id}`, uma vez por pessoa, guardado em
`conta_azul_people` (só CNPJ; sem policy). Ritmo: 8 req/s, 4 filas.

| Espelho `conta_azul_installments` | Conta Azul |
|---|---|
| `kind` | qual busca listou: `contas-a-receber` → `receita`, `contas-a-pagar` → `despesa` |
| `status` | normalizado dos dois enums; valor fora do mapa vira `desconhecido` (CHECK) |
| `gross_amount` / `net_amount` | `valor_composicao.valor_bruto` / `valor_liquido` (cai para `total` / `valor_total_liquido`) |
| `payment_date` | a maior `baixas[].data_pagamento` |
| `person_*` | `cliente` ou `fornecedor` do item da busca (o detalhe não traz pessoa); documento só se CNPJ |
| `invoice_number` / `invoice_type` | `fatura.numero` / `fatura.tipo_fatura` |
| `cost_centers` | `evento.rateio[].rateio_centro_custo[]` achatado em `{id, name, amount, gross}` |
| `ca_updated_at` | `data_alteracao`, convertida de São Paulo (−03:00) para UTC |

Centros de custo: `/v1/centro-de-custo` (`filtro_rapido=TODOS`) a cada execução, em
`conta_azul_cost_centers`. O upsert não manda `cost_center_id`, então a ligação feita pelo
admin sobrevive. A tela muda só essa coluna (GRANT por coluna; WITH CHECK exige centro do mesmo
tenant).

## Armadilha do cron (01/10/2026)

O cron manda `Bearer <app_service_role_key do Vault>` — JWT legado do projeto, emitido em
31/08. A `SUPABASE_SERVICE_ROLE_KEY` das Edge Functions está em outro formato, então comparar as
duas strings **nunca bate**: `conta-azul-sync` (e `company-watch`) respondiam 401 a todo cron, e
só o "Sincronizar agora" sincronizava. Corrigido em `_shared/chamadaDeServico.ts`: a função
pergunta ao banco, com a chave recebida, se o papel é `service_role`
(`public.caller_is_service_role()`, migration `20261001160000`). Prova: `net._http_response`
depois das execuções de `*/15`.

## Conciliação de receber (parte 3)

`conta_azul_reconcile_receivables(tenant)` roda no fim de cada sincronização (service role):

| Força | Regra | Efeito |
|---|---|---|
| forte | `conta_azul_nf_key(invoice_number)` igual dos dois lados (só dígitos, sem zero à esquerda) **e** CNPJ do cliente (`clients.cnpj` sem máscara) = `person_document` | casado e confirmado; se o Conta Azul está `quitado` com data de baixa, a parcela do Pulse vira `received` com `payment_date` = baixa |
| fraco | mesmo CNPJ, `abs(bruto − value) ≤ 0,01`, vencimento a até 7 dias | sugestão — precisa de confirmação |

Com vários candidatos (uma NF para várias parcelas), fica o par em que cada lado é o melhor do
outro (vencimento, depois valor); o resto espera a próxima rodada. Desfazer
(`conta_azul_undo_match`) devolve `status`/`payment_date` anteriores se a baixa veio do
casamento e grava a recusa em `conta_azul_match_rejections` — o par não volta. "Levar baixa"
(`conta_azul_apply_payment`) só em casamento confirmado com o Conta Azul quitado. As três ações
são definer com `assert_tenant_access` + `conciliacao:receber` (ADR-0021). A tela lê por
`conta_azul_receivables_reconciliation` (invoker).

## Autenticação

| Item | Valor |
|---|---|
| Fluxo | OAuth2 Authorization Code (confirmado) |
| Autorização | `https://login.contaazul.com/#/oauth/authorize?response_type=code&client_id=…&redirect_uri=…&state=…&scope=openid+profile+aws.cognito.signin.user.admin` |
| Escopo | fixo, de **administrador**. Não existe escopo de leitura (confirmado) |
| Código | expira em **3 minutos** (confirmado) |
| Token | `POST https://api-v2.contaazul.com/oauth/token`, `Authorization: Basic base64(client_id:client_secret)`, form-urlencoded; `grant_type=authorization_code` ou `refresh_token` |
| Access token | JWT, `expires_in: 3600` (1 h) |
| Refresh token | até 2 anos (emitidos desde 01/10/2026). **Rotaciona a cada uso**: o anterior morre (confirmado) |
| Erro na renovação | 400 `{error: "invalid_grant", error_subtype, error_description}`; subtipos `access_revoked`, `invalid_refresh_token`, `invalid_client` |
| Revogar | `DELETE https://api-v2.contaazul.com/oauth/connections/{id_empresa}` com Bearer → 204 (idempotente), 401, 404 sem conexão, 502 = repetir. O access token segue válido até completar a 1 h |
| Revogação pelo cliente | só se descobre na próxima renovação (`access_revoked`). Não há aviso |
| Empresa conectada | `GET /v1/pessoas/conta-conectada` → `id_empresa`, `documento` (CNPJ), `razao_social`, `nome_fantasia`, `email` |
| Base da API | `https://api-v2.contaazul.com` |

**Contornos obrigatórios**

- **Renovação serializada por conexão.** Duas renovações concorrentes com o mesmo refresh
  token: a segunda recebe `invalid_refresh_token` e a conexão morre. Travar a linha da conexão
  antes de renovar e gravar o token novo na mesma transação.
- **Escopo é de administrador.** O adaptador só expõe GET nesta fase (ADR-0044, item 3).
- **Credencial vazada = app excluído sem aviso** pelo Conta Azul. `client_secret` só nos
  secrets das Edge Functions; nunca em log, nunca no front.
- `client_id` de app novo tem 48 caracteres; a documentação pede para **não validar formato
  nem tamanho**.

## Endpoints usados (todos GET)

| Para quê | Endpoint | Paginação |
|---|---|---|
| Empresa conectada | `/v1/pessoas/conta-conectada` | — |
| Eventos alterados (incremental) | `/v1/financeiro/eventos-financeiros/alteracoes` | `pagina`, `tamanho_pagina` (padrão 10; máximo **não documentado**) |
| Parcelas de um evento | `/v1/financeiro/eventos-financeiros/{id_evento}/parcelas` | — |
| Parcela por id | `/v1/financeiro/eventos-financeiros/parcelas/{id}` | — |
| Busca de contas a receber | `/v1/financeiro/eventos-financeiros/contas-a-receber/buscar` | até 1000 |
| Busca de contas a pagar | `/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar` | até 1000 |
| Pessoa por id | `/v1/pessoas/{id}` | — |
| Centros de custo | `/v1/centro-de-custo` | até 1000 |
| Categorias | `/v1/categorias` | até 1000 |
| NFS-e | `/v1/notas-fiscais-servico` | até **100** |

## Mapa de campos — receber

Pulse `project_installments` ↔ parcela do Conta Azul com `evento.tipo = RECEITA`.

| Pulse | Conta Azul | Observação |
|---|---|---|
| `invoice_number` | `fatura.numero` (parcela por id) | chave forte, junto do CNPJ. O spec só dá exemplo do objeto `fatura` (a validar) |
| `clients.cnpj` | `/v1/pessoas/{cliente.id}` → `documento` | a busca e a parcela por id **não trazem** o documento; exige uma chamada por pessoa (cachear) |
| `value` | `valor_composicao.valor_bruto` | comparar bruto com bruto |
| — | `valor_composicao.valor_liquido` | retenção de imposto = bruto − líquido. Informação, não divergência |
| `due_date` | `data_vencimento` | |
| `payment_date` | `baixas[].data_pagamento` | a busca **não traz** data de baixa; só a parcela por id |
| `status = received` | `status = QUITADO` | ver quirk dos dois enums |
| — | `evento.data_competencia` | |
| — | `evento.codigo_referencia` | campo "para conciliação" desde 06/04/2026; útil na fase 2 para gravar o id da parcela do Pulse |

## Mapa de campos — pagar

| Pulse | Conta Azul | Observação |
|---|---|---|
| `project_costs` (`supplier_id`) + `suppliers.cnpj` | `/v1/pessoas/{fornecedor.id}` → `documento` | casamento por item: CNPJ + valor + data |
| `actual_amount_brl` | `valor_composicao.valor_bruto` | |
| `cost_date` | `baixas[].data_pagamento` / `data_vencimento` | |
| custo por centro (ADR-0031) | `evento.rateio[].rateio_centro_custo[]{id_centro_custo, valor, valor_bruto}` | casamento agregado por centro e mês de competência |

## Mapa de campos — centro de custo

| Pulse `cost_centers` | Conta Azul `/v1/centro-de-custo` | Observação |
|---|---|---|
| `id` | `id` | ligação manual feita pelo admin; os nomes não precisam ser iguais |
| `name` | `nome`, `codigo` | só exibição |
| `is_active` | `ativo` | |

## Quirks conhecidos

- **Vencimento é filtro obrigatório** na `buscar` (`data_vencimento_de/ate`), inclusive quando
  a busca é por alteração. Por isso o incremental usa `alteracoes`, e não a `buscar`.
- **A busca é magra.** Não traz id do evento, valor bruto/líquido, data de baixa, documento do
  cliente nem número da NF. Tudo isso exige a parcela por id (ou as parcelas do evento), uma
  chamada por registro, que conta contra os 10 req/s.
- **Dois enums de status.** Na busca: `EM_ABERTO`, `RECEBIDO`, `ATRASADO`, `RECEBIDO_PARCIAL`,
  `RENEGOCIADO`, `PERDIDO`. Na parcela por id: `PENDENTE`, `QUITADO`, `ATRASADO`,
  `RECEBIDO_PARCIAL`, `RENEGOCIADO`, `PERDIDO`, `CANCELADO`. O spec diz: `PENDENTE = EM_ABERTO`,
  `QUITADO = RECEBIDO`. Normalizar num enum nosso antes de comparar.
- **`alteracoes` tem falso positivo:** salvar sem mudar nada também gera entrada. E devolve só
  o id do evento, sem tipo nem o que mudou.
- **Exclusão não é documentada** no incremental (a validar). Contorno: varredura diária da
  janela marca como removida a parcela que sumiu.
- **Envelope muda por módulo:** a lista vem em `itens` no financeiro e em `items` em centros de
  custo e pessoas. O total vem em `itens_totais`, `totalItems` ou `paginacao.total_itens`.
  Parser por endpoint.
- **Formato de erro muda por módulo:** `{code, message}` no financeiro; `{error}` em pessoas e
  notas; `{error, error_subtype, error_description}` no OAuth.
- **Busca de pessoa tem padrão que restringe:** `tipos_pessoa` vem como Física e `tipo_perfil`
  como Cliente. Para achar CNPJ, mandar `tipos_pessoa=Jurídica` (e `tipo_perfil=Fornecedor` em
  pagar) (a validar). Máscara do documento no filtro também não está documentada.
- **NFS-e:** janela máxima de **15 dias** por consulta, no máximo 100 por página. O filtro se
  chama competência, mas a descrição fala em emissão. Não há filtro por número exato: usar
  `numero_nfse_inicial = numero_nfse_final`.
- **Datas de alteração em horário de São Paulo** (GMT-3), sem fuso no valor.
- `data_alteracao_de/ate` aceita no máximo 365 dias.
- `/v1/categorias` exige `permite_apenas_filhos` (boolean obrigatório).
- **Contas a pagar não filtra por fornecedor** (`ids_clientes` só existe em receber).

## Limites

- **600 req/min e 10 req/s por conta conectada** (não por app, desde 19/11/2025). Excesso → 429.
- **Na prática o limite é mais apertado (01/10/2026):** a 8 req/s com 4 filas, a primeira carga
  real tomou 429 que não passou com esperas de 1 s e 3 s. Hoje: 5 req/s, 3 filas, espera de 3, 8 e
  15 s em 429 (ou o `Retry-After`, se vier), e limite persistente vira pausa — a execução fecha
  com contagem e conciliação e a próxima continua de onde parou.
- Recuo exponencial em 429 e 5xx; não repetir 400, 401, 403, 404.
- Os headers de limite que a documentação manda acompanhar **não estão nomeados** (a validar).

## Ambiente de teste

- Não existe sandbox. O **App de Desenvolvimento** dá uma conta do ERP com dados fictícios por
  30 dias (prorrogável), com usuário e senha temporários.
- No app de desenvolvimento a URL de retorno é fixa em `https://www.contaazul.com`: o código
  precisa ser copiado da barra de endereço (ou gerado pela extensão "API Conta Azul Extension").
  O fluxo completo, com retorno para o Pulse, só existe no **app de produção**.
- Limite de 5 apps ativos por conta (desenvolvimento + produção).
- Criação: https://developers-portal.contaazul.com → "Criar uma aplicação" → Desenvolvimento ou
  Produção. O processo de homologação de app de produção **não está documentado**.

## Verificação pendente

Nada foi exercitado contra a API real. Antes de liberar:

- exclusão e cancelamento de parcela no incremental;
- máscara do CNPJ no filtro `documentos` e os padrões de `tipos_pessoa`/`tipo_perfil`;
- conteúdo real de `fatura{numero, rps, tipo_fatura}`;
- máximo de `tamanho_pagina` em `alteracoes` e o intervalo máximo entre as datas;
- nome dos headers de rate limit.
