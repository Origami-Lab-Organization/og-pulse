# Integração: consulta pública de CNPJ (BrasilAPI)

- Status: **ativa** desde 29/09/2026.
- Onde: cadastro de contato da Prospecção, no seletor de empresa e no botão de busca ao
  lado do CNPJ da empresa nova.
- Código: `src/services/cnpjLookupService.ts` (chamada) e `src/lib/prospecting/receita.ts`
  (tradução, compartilhada com o MCP); tipos em `src/types/receita.ts`.
- Também no MCP da Prospecção: `lookup_cnpj`, `enrich_company_from_cnpj` e cadastro de
  empresa com CNPJ (grava sozinho).

## Contrato

`GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (14 dígitos), sem chave e sem backend.
Sai do navegador de quem está cadastrando. Só o CNPJ digitado vai para fora: nenhum dado do
Pulse, do tenant ou da pessoa acompanha a chamada.

| Pulse (`prospect_companies`) | BrasilAPI | Observação |
|---|---|---|
| `name` | `nome_fantasia`, senão `razao_social` | a pessoa pode editar antes de salvar |
| `cnpj` | `cnpj` | guardado só com dígitos |
| `segment` | `cnae_fiscal_descricao` | atividade principal; só se vazio |
| `razao_social`, `nome_fantasia`, `porte`, `capital_social`, `data_abertura`, `situacao_cadastral` | mesmos campos | gravados pela RPC `save_prospect_company_receita` (ADR-0041) |
| `regime_tributario`, `regime_tributario_ano` | `regime_tributario[]` (ano mais recente) | filtro da Lei do Bem; vazio = não informado |
| `receita` (jsonb) | natureza, matriz/filial, CNAEs, histórico de regime, Simples/MEI, endereço, telefones, e-mail | só exibido |
| `prospect_company_partners` | `qsa[]` | nome, qualificação, entrada, tipo, CNPJ só de sócio-empresa. **Nunca** `faixa_etaria` nem `cnpj_cpf_do_socio` de pessoa |

No botão ao lado do CNPJ, a consulta só preenche campos vazios: o que a pessoa já digitou
não é sobrescrito.

## Falhas

- `404`: "CNPJ não encontrado na Receita." A tela oferece seguir o cadastro à mão.
- Rede, `429` ou `5xx`: "Consulta de CNPJ indisponível agora." O cadastro manual continua
  funcionando. A consulta é conveniência, nunca bloqueio.

## Por que não pela Edge Function

É dado público de empresa, não de pessoa, e não tem segredo envolvido. Um proxy no Supabase
só acrescentaria latência e um ponto de falha. Se a BrasilAPI passar a exigir chave, ou se o
volume pedir cache, a consulta migra para uma Edge Function com o mesmo contrato de saída.

## Gatilhos (reconsulta automática)

A Edge Function `company-watch` roda pelo cron `company-watch-daily`, às 07:00 de Brasília
(migration `20260929170000`). A cada dia ela reconsulta até **120 empresas** cuja última
consulta passou de 30 dias, com pausa de 400 ms entre elas, e grava pela mesma RPC da tela.

A notificação vai para a caixa de entrada dos responsáveis pelos contatos da empresa e de
quem a cadastrou (tipo `prospeccao_gatilho`, botão "Ver empresa") quando a empresa:
- entrou no Lucro Real;
- mudou de porte;
- deixou de estar ATIVA;
- ganhou sócio ou diretor novo.

A função aceita só o Bearer da service role, que vem do cron. O log registra apenas
contagens (consultadas, falhas, avisos), nunca dado de empresa. A tradução da resposta mora
em `supabase/functions/_shared/receita.ts`, a mesma que a tela e o MCP usam.

## Cadastro em lote

Botão "Importar CNPJs", na tela Empresas:
- Aceita a lista colada ou um CSV/TXT de até 2 MB, com no máximo 500 CNPJs por lote.
- Consulta dois CNPJs por vez, com pausa de 350 ms.
- O que já existe no tenant fica como está.
- Não cria contato.
