# ADR 0048: Novidades do produto na entrada do app

- Status: aceito
- Data: 2026-10-21
- Decisores: Italo Castro (tech lead)
- Relacionados: projete-app ADR-0131 (o mesmo aviso no Projete, origem do desenho), ADR-0027
  (capacidade), ADR-0030 (Amplitude depois do login), ADR-0032 (tour por capacidade),
  ADR-0046 (RLS sem custo por linha), ADR-0047 (e-mail salvo no projeto)

## Contexto

Entregas novas chegavam ao time sem aviso: o item aparecia no menu, ou não aparecia, e cada
pessoa descobria sozinha (ou não descobria). O Projete já resolve isso com um modal de
novidades na entrada, com banner da edição e tópicos que abrem por escolha da pessoa. O
pedido foi trazer o mesmo para o Pulse, começando pela entrega de 21/10/2026: E-mails e
Agenda do Outlook no menu para todos, e-mail salvo no projeto (ADR-0047) e o fim do
dashboard do admin. Pedido explícito: cada tópico explica **o motivo** e **as
funcionalidades**.

## Decisão

1. **Edição editorial versionada em código** (`src/content/productNews.ts`), uma vigente
   por vez. Anunciar a próxima entrega é trocar a edição e a `version`; quem não leu a
   anterior deixa de vê-la. Não há tela de cadastro: anúncio é texto revisado junto com a
   entrega, no mesmo PR.
2. **Cada tópico responde "Por quê" e "O que dá para fazer"**, nesta ordem, com campos
   próprios (`reason`, `features`). O tipo obriga os dois: tópico sem motivo não compila.
3. **Quem vê.** Todo autenticado com conta criada antes de `publishedAt` (quem chegou
   depois já encontra o produto assim). Os tópicos são recortados pela mesma capacidade da
   tela anunciada, como na Central de Ajuda: o tópico do dashboard só aparece para quem
   tem `configuracao:editar`. Sem tópico sobrando, não há anúncio. O anúncio em si não tem
   capacidade, pelo mesmo motivo da Ajuda: não expõe dado, só aponta para telas que a
   própria rota protege.
4. **Prioridade.** O tour de quem acabou de chegar (ADR-0032) vem antes, e o anúncio
   espera qualquer diálogo aberto fechar (observa o DOM e abre quando a tela está livre).
5. **Leitura no banco, por pessoa e versão** (`product_news_reads`, PK `user_id, version`),
   para valer em outro navegador e no app instalado. Sem `tenant_id`: a leitura é da
   conta, não da empresa. RLS: cada um lê e grava só a própria linha, com
   `(SELECT auth.uid())` avaliado uma vez por consulta (ADR-0046); sem UPDATE nem DELETE.
   Qualquer saída registra a leitura: botão, X, Escape, clique fora ou a chamada principal.
6. **Falha nunca prende ninguém.** Erro ao consultar conta como "já viu" (mesma regra do
   tour, PUL-251); erro ao gravar fecha o anúncio mesmo assim e ele pode voltar na próxima
   entrada.
7. **Banner nos tokens do tema.** Fundo na escala `green` da marca (fixa nos dois temas),
   grade feita com `--neutral-0`, arte ilustrativa com cartões em `bg-card` e sem dado
   real. Em celular de tela baixa a arte some para a lista caber.
8. **Amplitude** (ADR-0030), com os nomes do Projete para as duas bases serem comparáveis:
   `novidade_exibida`, `novidade_topico_aberto` (com `topico`) e `novidade_respondida`
   (com `acao` — continuar, chamada, fechar, fora —, `segundos` até sair, limitado a 600,
   e `topicos_abertos`). Todos levam `novidade` (versão) e `formato: modal`.

9. **Rever pela Central de Ajuda.** O card "Novidades do Pulse" abre a edição vigente a
   qualquer hora, como o "Rever o tour". Não depende da leitura no banco, que só decide a
   abertura automática; os tópicos seguem recortados pela capacidade. Os eventos levam
   `origem` (`entrada` ou `ajuda`).

Diferenças em relação ao Projete: sem "Sugerir melhoria" e sem WhatsApp, que o Pulse não
tem; foco e teclado vêm do Dialog e do Accordion do Radix (shadcn), não de código próprio.

## Consequências

- Benefícios: toda entrega relevante chega a quem usa, com o porquê, e o Amplitude mostra
  quantos abriram cada tópico e quantos seguiram a chamada.
- Custos: cada entrega anunciada pede texto revisado no PR. Uma consulta pequena por
  entrada de quem ainda pode ver a edição.
- Riscos: anúncio de tela que a pessoa não alcança. Mitigação: recorte por capacidade e a
  regra no conteúdo de só anunciar o que já está no ar.
- Como reverter: tirar `<ProductNews />` do `AppLayout` some com o anúncio sem perder as
  leituras; o rollback `20261021130000_product_news_reads_rollback.sql` apaga a tabela.

## Evidências

- Migration aplicada num Postgres local em 21/10/2026: dono grava e lê, confirmação
  repetida não duplica, gravar leitura de outra pessoa é recusado pela RLS, apagar é
  recusado por permissão, outra pessoa não vê a leitura alheia; rollback e reaplicação.
- Prints do modal (Playwright, Chromium) em 1280 px claro e escuro e 390 px, fechado e com
  um tópico aberto; foco inicial no primeiro tópico.
- Aplicada em produção em 21/10/2026, antes do deploy do front, por pedido do tech lead
  (`supabase db push`, só esta e a 20261021120000). Conferido depois, como usuário
  autenticado e em transação desfeita: tabela com RLS, duas policies, nenhuma leitura
  registrada para quem ainda não viu.
- Causa do "não aparece no local" antes disso: o local aponta para o banco de produção; sem
  a tabela, a consulta falhava e a regra do item 6 respondia "já viu". Comportamento
  esperado, não defeito.
- Código: `src/content/productNews.ts`, `src/hooks/useProductNews.ts`,
  `src/components/product-news/`, `src/lib/productNews.ts`.

## Emenda — 2026-10-21 (edição "O Pulse ficou mais seu")

O Italo pediu um banner de tudo o que saiu no dia, inclusive o Meu Kanban (ADR-0050).

- A edição `meu-espaco-2026-10` substitui a `outlook-2026-10`. Uma edição vigente por vez:
  quem não leu a do Outlook **não vê as duas**, vê só esta — que repete o que aquela dizia
  (e-mails, agenda, e-mail salvo no projeto) e soma notas, sino, Meu Kanban e
  produtos internos. Quem leu a do Outlook vê esta uma vez.
- Sete tópicos, cada um com "Por quê" e "O que dá para fazer"; notas, e-mail no projeto e
  produtos recortados pela capacidade da tela. "Como conectar" virou um item dos tópicos de
  E-mails e Agenda. O tópico do Dashboard único saiu, a pedido do Italo.
- Arte nova (`meu-espaco`): uma nota fixada, uma notificação nova e um lembrete do kanban.
- Sem chamada principal: "Continuar" passa a ser o botão principal quando é a única ação
  (antes ficava apagado, como secundário).
- O Meu Kanban entrou no menu, dentro de Meu Espaço, para o tópico ter para onde apontar.
- O tópico do kanban anuncia o lembrete no navegador e no celular "se você ativar": o push
  depende das chaves VAPID que o ADR-0050 lista como pré-requisito manual.
