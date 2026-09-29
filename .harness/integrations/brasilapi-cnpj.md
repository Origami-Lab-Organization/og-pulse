# Integração: consulta pública de CNPJ (BrasilAPI)

- Status: **ativa** desde 29/09/2026.
- Onde: cadastro de contato da Prospecção, no seletor de empresa e no botão de busca ao
  lado do CNPJ da empresa nova.
- Código: `src/services/cnpjLookupService.ts`; tipos em `src/types/cnpjLookup.ts`.

## Contrato

`GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (14 dígitos), sem chave e sem backend.
Sai do navegador de quem está cadastrando. Só o CNPJ digitado vai para fora: nenhum dado do
Pulse, do tenant ou da pessoa acompanha a chamada.

| Pulse (`prospect_companies`) | BrasilAPI | Observação |
|---|---|---|
| `name` | `nome_fantasia`, senão `razao_social` | a pessoa pode editar antes de salvar |
| `cnpj` | `cnpj` | guardado só com dígitos |
| `segment` | `cnae_fiscal_descricao` | atividade principal |

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
