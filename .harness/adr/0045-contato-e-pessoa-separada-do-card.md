# ADR 0045: O contato é uma pessoa, separada do card do Pipeline

- Status: aceito
- Data: 2026-10-01
- Decisores: Guilherme Valadares

## Contexto

O time pediu um item Contatos no menu Comercial, no estilo de Empresas. Ele deve ter todos
os contatos da Prospecção, permitir criar e editar, e ter um cadastro que mostra, enquanto
se digita, se a pessoa já existe, para não duplicar. É a mesma experiência que a empresa já
tem.

Até aqui a pessoa só existia dentro do card: `prospects.contact_name`, `contact_role`,
`contact_email`, `contact_phone`, `linkedin_url` e `instagram_url`. Disso decorriam três
problemas:

1. **Não havia o que selecionar.** Reabordar alguém criava outra cópia da pessoa, com os
   dados redigitados.
2. **Nada impedia a duplicação.** A empresa tem índice único por CNPJ e LinkedIn; a pessoa
   não tinha nenhum.
3. **Não havia lugar para quem ainda não foi abordado.** Todo contato nascia como card em
   "A abordar", mesmo quando ninguém tinha decidido abordá-lo.

Alternativas consideradas:

- **Contatos como outra vista dos cards**, sem mudar o banco. Descartada: a busca só
  poderia avisar "já existe" e abrir o card existente. Não daria para reaproveitar a pessoa
  num card novo, que era o pedido.
- **Pessoa em tabela própria, com drop das colunas do card no mesmo deploy.** Descartada
  pelo que aconteceu em 30/09/2026: o drop de `competitor_name` quebrou o salvamento de
  quem estava com a tela aberta. Aqui ainda há o MCP da Prospecção instalado nas máquinas e
  o seed do tenant demo, que gravam esses campos no card.
- **Pessoa em tabela própria, com o card guardando uma cópia mantida pelo banco**
  (escolhida).

## Decisão

1. **`prospect_contacts` é a pessoa:** nome, cargo, empresa atual, e-mail, telefone,
   LinkedIn e Instagram, com a mesma RLS da empresa (`prospeccao:ler` / `prospeccao:editar`)
   e DELETE só para quem não tem card (a FK recusa o resto).
2. **Deduplicação por e-mail OU LinkedIn**, por organização, sem caixa nem espaço. São
   índices únicos parciais, a mesma regra da empresa (CNPJ OU LinkedIn). O nome não é único:
   homônimo é legítimo, e a busca o mostra antes de "Cadastrar outro".
3. **`prospects.contact_id` liga o card à pessoa** (NOT NULL). Uma pessoa pode ter vários
   cards ao longo do tempo, mas só um em andamento: a tela recusa abrir um segundo e oferece
   abrir o que já existe.
4. **O card guarda o negócio** (etapa, responsável, canal, alavanca, valor, observações).
   Os campos de contato do card passam a ser **cópia da pessoa, mantida por trigger**:
   - card novo sem `contact_id`: o banco acha a pessoa pelo e-mail ou LinkedIn, ou a cria
     (`prospects_link_contact`). É o caminho do MCP, do seed e do "Virar contato";
   - card novo com `contact_id`: copia os dados da pessoa;
   - edição da pessoa: desce para todos os cards dela (`prospect_contacts_propagate`);
   - edição direta dos campos no card (cliente antigo): sobe para a pessoa
     (`prospects_push_contact`) e dela desce para os outros cards.
5. **A empresa não propaga.** O card fica na conta em que o negócio foi aberto, porque mudar
   a empresa da pessoa não pode mover um Ganho, com orçamento, projeto e cliente, para outra
   conta.
6. **Contato criado na tela Contatos não entra no Pipeline.** "Levar para a Prospecção", na
   ficha, abre o card em "A abordar". Contato criado na Prospecção aparece em Contatos
   sozinho.
7. **Migração:** cards com o mesmo e-mail ou o mesmo LinkedIn viram uma pessoa só, inclusive
   por transitividade (A e B pelo e-mail, B e C pelo LinkedIn). O card mais recente define
   os dados, e os outros só completam o que falta. Nome igual sozinho não une. O valor de
   antes de cada card fica em `legado_contatos.prospects_antes_dos_contatos`, fora da API.

## Consequências

- **Benefícios:**
  - Uma pessoa, um cadastro: a busca mostra quem já existe na Prospecção e na tela Contatos.
  - O banco recusa e-mail ou LinkedIn repetido, com mensagem que diz qual campo repetiu.
  - Reabordar alguém reaproveita a pessoa e mostra o histórico de cards dela.
  - Nenhum leitor de `prospects.contact_*` mudou: quadro, métricas, filtros, ficha do
    cliente, orçamento e MCP continuam iguais.
- **Custos:**
  - Duas cópias do mesmo dado, sincronizadas por três triggers. A fonte é a pessoa.
  - Editar a pessoa atualiza `updated_at` de todos os cards dela. A métrica de reunião usa
    essa data como reserva quando a reunião não tem data própria.
- **Riscos:**
  - Na união, se dois cards da mesma pessoa tinham e-mails diferentes, a pessoa fica com o
    do card mais recente, e o outro só existe no legado. O mesmo vale para o nome.
  - LinkedIn escrito de dois jeitos (com e sem `https://www.`) não é reconhecido como o
    mesmo, como já acontece com a empresa.
  - O MCP ainda decide duplicidade de contato pelo nome dentro da empresa
    (`apps/mcp-prospeccao/src/duplicidade.ts`). O banco cobre e-mail e LinkedIn, mas o MCP
    não sabe escolher uma pessoa existente pelo id. Fica para a próxima versão dele.
- **Como reverter:** `supabase/rollback/20261001190000_prospect_contacts_rollback.sql`. Os
  cards antigos voltam ao valor de antes; contatos sem card criados depois se perdem
  (exportar `public.prospect_contacts` antes). Apagar as colunas de contato do card só
  depois de todos os escritores gravarem na pessoa, em deploy separado.

## Atualização — 02/10/2026

Cards duplicados apareceram no quadro (mesma pessoa em Respondeu e em Reunião feita). Causa:
a absorção das Oportunidades (`20260929120000`) só devolvia a oportunidade ao contato de origem
com vínculo explícito; oportunidade cadastrada à mão para quem já estava na Prospecção virou
card novo, e a união de contatos acima não os juntou porque só une por e-mail/LinkedIn. A
migration `20261002120000_prospect_une_cards_duplicados` une esses cards (card da migração +
card existente, mesma empresa e mesmo nome, pelo menos um em andamento; ou dois cards em
andamento da mesma pessoa), guarda tudo em `legado_contatos.uniao_*` e passa a garantir no
banco "um card em andamento por pessoa" — que até ali só a tela garantia.

## Evidências

- Migration: `supabase/migrations/20261001190000_prospect_contacts.sql`
- Ensaio em 01/10/2026 em Postgres (PGlite) com esqueleto do schema: união transitiva,
  caixa e espaço no e-mail, e-mail vazio, homônimo, outra organização, card pelo caminho
  antigo e pelo novo, propagação nos dois sentidos, deduplicação, exclusão com e sem card,
  RLS como `authenticated` e ida, volta e ida de novo. 37 verificações sem falha.
- Tela: `src/pages/ProspeccaoContatos.tsx`; seletor: `src/components/prospeccao/ProspectContactSelect.tsx`.
