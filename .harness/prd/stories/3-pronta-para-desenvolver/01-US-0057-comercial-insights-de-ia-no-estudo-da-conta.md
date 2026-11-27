# US-0057 — Insights de IA no Estudo da conta

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 01 em `3-pronta-para-desenvolver`
- **Pedida por / em:** Victor Couto, 26/11/2026 ("gerar insights de IA igual no Econodata… quando
  colocarmos a empresa para qualificar, o usuário pode pressionar os insights de IA para ajudar na
  qualificação")
- **Refinada e aprovada por / em:** Victor Couto, 27/11/2026 (decisões abaixo)
- **Depende de:** US-0053 (página da empresa e Estudo da conta), US-0056 (faixa informada pelo time)
- **Relacionadas:** US-0022 e US-0024 (a IA propõe, a pessoa decide), US-0054
- **ADR:** ADR-0057 (runner local com a assinatura de quem gera), variação da fase 1 do ADR-0054
- **Referência:** a página da empresa no Econodata tem blocos "Clientes", "Concorrentes" e "Produtos e
  Serviços", cada um com um botão "Gerar insights com IA".

## Descrição

**Como** admin que qualifica as empresas,
**quero** pedir à IA, na página da empresa, o que ela vende, para quem vende, com quem concorre e o
que saiu sobre ela, com as fontes, e uma proposta de porte,
**para** estudar a conta mais rápido e corrigir o porte estimado sem pesquisar tudo à mão.

### Contexto

O Estudo da conta (US-0053) guarda o que a pessoa junta à mão; a busca de notícias e referências
ficou para depois. O Econodata gera blocos de insights por IA, e o Victor quer o mesmo no Pulse. Hoje
só o Victor qualifica empresas. Para não criar custo de API agora, a IA roda num **runner local**, no
Mac dele, com a assinatura do Claude dele (ADR-0057). A tela e os dados servem também ao caminho
com chave de API (fase 2 do ADR-0054), quando outra pessoa precisar gerar.

### Escopo

- Inclui:
  - botão "Gerar insights com IA" na página da empresa, para empresas no Pulse (da Qualificação em
    diante: em qualificação, com Oportunidade em andamento ou cliente);
  - quatro temas, cada um com as fontes e a data: produtos e serviços, clientes (para quem vende),
    concorrentes, notícias e referências recentes;
  - proposta de faixa de funcionários e de faturamento, com fonte, que a pessoa aceita ou recusa;
  - histórico: cada geração é uma versão nova; a página mostra a mais recente e as anteriores ficam
    consultáveis;
  - capacidade nova, ligada só no perfil do Victor;
  - estado do runner na página (disponível ou não);
  - o runner: processo no Mac do Victor que pega o pedido, roda o Claude Code com busca na web e
    grava o resultado com o login do Victor.
- Não inclui:
  - chave de API e Edge Function (fase 2 do ADR-0054); outros admins gerando;
  - insights automáticos, sem a pessoa pedir; insights na Base (empresa fora do Pulse);
  - propor evidências do BANT, site ou LinkedIn;
  - mudar o fit ou a priorização pela IA (ADR-0042);
  - dados comprados (Serasa, Econodata).

## Critérios de aceite

**Cenário 1: pedir os insights**

- **Dado** uma empresa no Pulse, o runner disponível e alguém com a capacidade de gerar insights;
- **Quando** clica em "Gerar insights com IA";
- **Então** a página mostra o pedido na fila e, depois, gerando;
- **E** ao terminar, mostra os quatro temas (produtos e serviços, clientes, concorrentes, notícias e
  referências), cada um com as fontes em link e a data da geração.

**Cenário 2: fonte obrigatória**

- **Dado** um insight que a IA devolveu sem fonte;
- **Então** ele não aparece;
- **E** o tema sem nenhum insight com fonte aparece vazio, sem texto inventado.

**Cenário 3: proposta de porte**

- **Dado** que a geração trouxe uma faixa de funcionários ou de faturamento com fonte;
- **Então** a página mostra a proposta com a fonte e os botões Aceitar e Recusar;
- **Quando** a pessoa aceita;
- **Então** a faixa passa a valer como informada pelo time, estimada, com a confiança e a fonte da
  proposta, como no modal da US-0056 (cartão Porte, contas, fit e filtros pelo ponto médio);
- **E** quem aceitou e quando ficam registrados;
- **Quando** a pessoa recusa, nada muda na empresa e a recusa fica registrada.

**Cenário 4: gerar de novo**

- **Dado** uma empresa com insights gerados;
- **Quando** a pessoa gera de novo;
- **Então** a página mostra a versão nova;
- **E** as versões anteriores continuam consultáveis, com a data de cada uma.

**Cenário 5: runner fora do ar**

- **Dado** que o runner não dá sinal há mais tempo que o limite combinado (Mac desligado ou runner
  parado);
- **Então** a página mostra "Runner indisponível" e o botão fica desabilitado;
- **E** nenhum pedido novo entra na fila.

**Cenário 6: quem pode gerar**

- **Dado** alguém sem a capacidade de gerar insights (todos, menos o Victor, nesta versão);
- **Então** o botão não aparece;
- **E** o banco recusa o pedido feito por fora da tela;
- **E** quem lê a empresa continua vendo os insights e as propostas já gerados.

**Cenário 7: a geração falha**

- **Dado** um pedido em que o runner não conseguiu gerar (limite da assinatura, erro da busca,
  resposta fora do formato);
- **Então** a página mostra que a geração falhou e deixa pedir de novo;
- **E** a versão anterior, se houver, continua na tela.

## Decisões (Victor Couto, 27/11/2026)

1. **Temas:** produtos e serviços, clientes, concorrentes, notícias e referências.
2. **O que a IA grava:** os insights e a proposta de porte (faixa de funcionários e de faturamento,
   com fonte). Só vale depois do aceite. Nada de BANT, site ou LinkedIn nesta versão.
3. **Quando:** empresa no Pulse, da Qualificação em diante. Não na Base.
4. **Como roda:** runner local no Mac do Victor, com a assinatura do Claude dele, porque só ele
   qualifica empresas hoje (ADR-0057). Sem chave de API nesta versão.
5. **Quem gera:** só o Victor, por capacidade própria ligada só no perfil dele. Outro admin gerando
   pela assinatura do Victor seria compartilhar a conta; quando alguém precisar, entra a chave de API
   (fase 2 do ADR-0054) numa história própria.
6. **Runner fora do ar:** a página avisa e o botão fica desabilitado; não há fila esperando.
7. **Gerar de novo:** cria uma versão nova; as anteriores ficam consultáveis.
8. **Fonte obrigatória:** insight sem fonte não aparece (regra do ADR-0054).

## Contexto técnico

- **Objetivo observável:** na página da empresa, quem tem a capacidade pede os insights, vê o
  andamento e recebe os quatro temas com fontes e a proposta de porte, aceitável ou recusável.
- **Termos do domínio:** Estudo da conta (US-0053); porte informado pelo time, faixa, confiança e
  fonte (US-0056); "a IA propõe, a pessoa decide" (ADR-0054).
- **Comportamento atual:**
  - PROVADO: o Estudo da conta guarda síntese, links, notas e arquivos (`prospect_company_estudo`,
    migration 20261126100000; `src/components/prospeccao/empresa/SecaoEstudo.tsx`).
  - PROVADO: a faixa informada pelo time, com base, confiança e fonte, mora em
    `prospect_companies.funcionarios_min/max/base/confianca/fonte` e
    `faturamento_min/max/confianca/fonte` (migration 20261127100000, US-0056).
  - PROVADO: o MCP da Prospecção entra no Pulse com o login da pessoa e a chave publicável, sem chave
    de serviço, com a sessão em cache próprio no disco (`apps/mcp-prospeccao/src/supabase.ts`).
  - PROVADO: o worker de transcrição puxa de uma fila com RLS e só faz conexão de saída
    (`apps/transcription-worker/README.md`, ADR-0039).
  - PROVADO: a Análise de mercado chama a API da Anthropic com chave (`market-analysis-start`); não
    é o caminho desta história.
- **Restrições e padrões aplicáveis:**
  - capacidade nova por migration, linha na `capability-matrix.md`, RLS equivalente (ADR-0027);
  - o runner grava com o login do Victor, nunca com a chave de serviço; nenhum segredo no
    repositório nem em log;
  - dados de pessoas só no que é profissional e ligado à empresa (ADR-0041, ADR-0054);
  - sem texto explicativo na tela; complexidade até 7 por função;
  - o pedido e o resultado ficam no tenant, com RLS por tenant e capacidade.
- **Riscos para investigar:** o limite de uso da assinatura no Claude Code (a geração pode falhar no
  meio, cenário 7); o tempo de uma geração com várias buscas (minutos); a resposta fora do formato
  esperado; homônimos e notícias de outra empresa (mitigado pela fonte e pelo aceite); o sinal de vida
  do runner sem polling caro.
- **Provas esperadas:** cenários 1 a 7 no localhost pelo Victor, com o runner ligado e desligado; o
  banco recusa o pedido de quem não tem a capacidade; a proposta aceita aparece no cartão Porte como
  informada pelo time.
- **Fora do escopo:** chave de API, Edge Function, teto mensal, outros admins, BANT, Base.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
