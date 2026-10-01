# Integração: Conta Azul (API v2)

- Status: **parte 1 de 4 (conexão)** — conectar, ver a empresa ligada, desconectar. Sem
  sincronização ainda.
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
