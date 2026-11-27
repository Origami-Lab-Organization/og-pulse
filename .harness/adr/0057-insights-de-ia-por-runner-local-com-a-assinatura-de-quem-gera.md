# ADR 0057: Insights de IA por runner local, com a assinatura de quem gera

- Status: aceito
- Data: 2026-11-27
- Decisores: Victor Couto

## Contexto

A US-0057 traz para a página da empresa os insights de IA do Estudo da conta: produtos e serviços,
clientes, concorrentes, notícias e uma proposta de porte, sempre com fonte. O ADR-0054 já previa duas
fases para a IA no comercial:

- fase 1, pela assinatura do Claude de cada pessoa, via MCP, sem custo novo, mas a pessoa precisa
  pedir ao Claude dela;
- fase 2, dentro do Pulse, com chave de API numa Edge Function, com um clique e custo por uso (cerca
  de US$ 0,15 a 0,40 por geração com busca na web).

Em 27/11/2026, só o Victor qualifica empresas. Ele quer o botão na página e não quer custo de API
agora. Alternativas consideradas:

1. **MCP com a assinatura da pessoa:** sem custo, mas sem botão; a pessoa cola o pedido no Claude.
2. **Runner local com uma assinatura:** botão no Pulse, sem custo de API. Uma assinatura é de uso
   pessoal: serve se o runner atende só o dono dela.
3. **Chave de API numa Edge Function:** um clique para qualquer pessoa, com custo por uso e teto.

## Decisão

Opção 2, só para o Victor.

- **Quem gera:** a capacidade nova `prospeccao:gerar-insights` nasce ligada só no perfil do
  Victor, por exceção individual, e em nenhum papel. O banco recusa o pedido de quem não a tem.
  **O runner atende só os pedidos do dono da assinatura:** outro admin gerando pelo runner do Victor
  seria compartilhar a conta, o que a assinatura individual não permite.
- **Como roda:** o botão grava um pedido numa fila com RLS. Um processo no Mac do Victor puxa os
  pedidos, roda o Claude Code com a assinatura dele e a busca na web, e grava o resultado. Ninguém
  chama o Mac: ele só faz conexão de saída, como o worker de transcrição (ADR-0039).
- **Com que login:** o runner entra no Pulse com o login do Victor e a chave publicável, como o MCP
  da Prospecção. Nunca com a chave de serviço: a RLS confere cada escrita. A senha e a sessão ficam
  na máquina dele, fora do repositório e dos logs.
- **Disponibilidade:** o runner dá sinal de vida periodicamente. Sem sinal recente, a página mostra
  "Runner indisponível" e não aceita pedido novo; não há fila esperando.
- **O que a IA grava:** propostas, como no ADR-0054. Os insights entram com fonte obrigatória; a
  proposta de porte só passa a valer na empresa depois do aceite de uma pessoa, registrado com quem e
  quando. A IA não mexe no fit nem na priorização (ADR-0042).
- **O mesmo desenho serve à fase 2:** a fila, os insights e as propostas não dependem de quem chama a
  IA. Trocar o runner pela Edge Function com chave de API (ou somar as duas) não muda tela nem dados.

## Consequências

- Benefícios: botão na página, sem custo de API; valida a qualidade dos insights antes de pagar por
  uso.
- Custos: um processo a manter no Mac do Victor; a geração depende de a máquina estar ligada e do
  limite de uso da assinatura.
- Riscos: a assinatura chegar ao limite no meio de uma geração (a página mostra a falha e deixa
  pedir de novo); homônimos e notícias de outra empresa (mitigado pela fonte obrigatória e pelo
  aceite); o runner passar a atender outra pessoa sem decisão nova (barrado pela capacidade e pela
  regra acima).
- Como reverter: desligar o runner e tirar a capacidade do perfil; os insights e as propostas já
  gravados continuam no histórico.
- Quando revisar: quando outra pessoa precisar gerar insights. Aí entra a fase 2 do ADR-0054 (chave
  de API, teto mensal), numa história própria.

## Evidências

- US-0057 (`prd/stories/3-pronta-para-desenvolver/01-US-0057-comercial-insights-de-ia-no-estudo-da-conta.md`).
- ADR-0054 (fases da IA no comercial), ADR-0039 (worker fora do Supabase, só conexão de saída),
  ADR-0042 (fit por regra), ADR-0027 (capacidade e RLS).
- `apps/mcp-prospeccao/src/supabase.ts` (login da pessoa, sem chave de serviço).
