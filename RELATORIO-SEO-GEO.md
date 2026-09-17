# Relatório SEO & GEO — Origami Pulse

> Worktree: `/Users/italocastro/Projects/_seo-geo-worktrees/og-pulse` · branch `seo-geo/pesquisa-intencao`
> Data: 16/09/2026 · Nada commitado: tudo fica no worktree para revisão manual.

---

## 1. Resumo em cinco linhas

- **Sim, existe superfície pública indexável** — e ela já é boa: a home e 11 páginas de conteúdo são **pré-renderizadas no build** (`scripts/prerender-landing.mjs`), com JSON-LD, sitemap e `llms.txt` gerados da mesma fonte. A área logada é `noindex` de propósito. O problema clássico de SPA **já foi resolvido neste repo**.
- O Pulse **não é ferramenta interna**: é SaaS B2B vendido (planos, autocadastro, teste de 14 dias, ICP declarado). Tem público de busca.
- Rodei **100 consultas** no autocomplete do Google (pt-BR/BR), em 5 rodadas.
- **Criei 2 páginas**, não 12: `/controle-de-horas-por-projeto` e `/valor-hora-de-venda-de-servicos`. Foram as duas únicas intenções com demanda confirmada que **nenhuma** das 11 páginas existentes respondia.
- Aprofundei a página de custo hora (1 FAQ nova capturando um termo forte) em vez de criar página para ele.

---

## 2. Passo 0 — Harness lido

Li, nesta ordem, dentro do worktree: `AGENTS.md`, `.harness/context.md`, `.harness/boundaries.md`, `.harness/domain-glossary.md`, `.harness/patterns/design-system.md`, `.harness/jornadas/sobre-pulse.md`, `.harness/adr/0030-analytics-vitrine-cookieless-e-amplitude-apos-login.md` e a lista completa de ADRs.

**Conflito com boundaries: nenhum.** O que mais chegou perto:

| Boundary | Como foi respeitado |
|---|---|
| Não criar/alterar UI, copy ou rota sem conformar ao Design System e à jornada | Não criei componente, CSS, rota nem token. As páginas novas são **dado** consumido pelo componente `ContentPage` que já existe; a rota `/:slug` já existe em `App.tsx` e no `prerender-entry.tsx`. |
| Nunca usar "Lead", "CRM" ou "Funil" na interface | O texto novo usa Oportunidade, Pipeline, Orçamento, Timesheet, atividade interna, centro de custo — conforme `domain-glossary.md`. As palavras proibidas não aparecem. |
| Não tratar dado financeiro/pessoal como público | Nenhum dado real de tenant, cliente ou pessoa entrou no conteúdo. Os números das páginas são exemplos didáticos explicitamente rotulados como exemplo. |
| Nunca gerar lógica de negócio sem teste | Não há lógica de negócio nova. Ainda assim adicionei `src/test/landing-content-pages.test.ts`, que valida a integridade das páginas (slug único, `related` válido, FAQ presente, rota indexável, coerência com sitemap e `llms.txt`). Não existia nenhum teste cobrindo a landing. |
| `robots.txt` permite GPTBot/ClaudeBot/PerplexityBot; bloquear exige ADR | Não mexi no `robots.txt`. |
| Analytics da vitrine (ADR-0030) | Não mexi. |

---

## 3. Passo 1 — O produto

**Origami Pulse** é um SaaS B2B de **PSA (Professional Services Automation)** focado em rentabilidade de projeto, feito pela Origami Lab e **vendido para terceiros** (não é ferramenta interna):

- **Quem paga:** empresas de serviços profissionais brasileiras que vendem projetos — consultorias, agências, software houses, estúdios de produto, escritórios de arquitetura e de engenharia. Faturamento-alvo R$ 1M–30M/ano.
- **Quem decide a compra:** sócio-fundador de consultoria e dono de agência (personas primárias); o gerente de projetos é influenciador, não decisor.
- **Cobrança:** flat por empresa, não por usuário. Starter grátis, Growth R$ 790/mês, Avançado R$ 1.490/mês, Enterprise a partir de R$ 3.500/mês. Autocadastro em `/register` com **teste de 14 dias** (ADR-0028).
- **O que faz:** pipeline comercial com Oportunidades e Orçamentos, catálogo de serviços, alocação por pessoa/projeto/mês, apontamento de horas (timesheet semanal), custo hora por tipo de contratação, margem planejada × realizada, portfólio, OKRs, analytics e conexão com IA via MCP.
- **O substituto real no mercado, segundo o próprio material do produto, é o Excel** — e isso se confirmou na pesquisa de demanda (ver §5).

Fontes: `README.md`, `AGENTS.md`, `.harness/jornadas/sobre-pulse.md`, `.harness/domain-glossary.md`, `src/landing/content.ts`, `src/pages/`, `supabase/migrations/`.

---

## 4. Passo 2 — A superfície pública (a primeira pergunta)

**Existe, é pública, é indexável e não sofre do problema de CSR.** Verificado no código, não presumido:

| Item | Situação |
|---|---|
| Landing/marketing | Sim: `origamipulse.com.br`, home em `src/pages/LandingPage.tsx`, copy em `src/landing/content.ts`. |
| Renderização | **Não é CSR puro.** `npm run build` roda `vite build` e depois `scripts/prerender-landing.mjs`, que faz build SSR de `src/landing/prerender-entry.tsx` e grava HTML completo em `dist/<rota>/index.html`. A SPA hidrata por cima. |
| Rotas públicas × autenticadas | `vercel.json` manda **toda rota do app** (login, dashboard, projetos…) para `app.html`, que carrega `<meta name="robots" content="noindex, nofollow">`. As rotas públicas são servidas como arquivos estáticos pré-renderizados. |
| `robots.txt` | `public/robots.txt`, com `Allow` explícito para GPTBot, ClaudeBot, PerplexityBot e Google-Extended, e o sitemap declarado. |
| `sitemap.xml` | Gerado no build a partir de `PUBLIC_ROUTES`; só entra rota `indexable: true`. |
| `llms.txt` | Gerado no build (`buildLlmsTxt`), com definição, oferta, glossário, FAQ e a lista de páginas de conteúdo. |
| Metadados | `renderHead` gera title, description, canônica, robots, Open Graph, Twitter Card e JSON-LD por rota. Página `noindex` não declara canônica (correto). |
| JSON-LD | Home: Organization, WebSite, SoftwareApplication (com Offer) e FAQPage. Conteúdo: WebPage/Article + BreadcrumbList + FAQPage. O build **falha alto** se faltar. |

Ou seja: o trabalho estrutural de SEO já estava feito, e bem feito. **Não havia nada a consertar na arquitetura** — a pergunta útil passava a ser de conteúdo: que intenção de busca real ainda não tem resposta aqui.

---

## 5. Passo 3 — Pesquisa de demanda

### Método

Fonte: autocomplete do Google, `client=chrome`, `hl=pt-BR`, `gl=br`, ~350 ms entre requisições.

```
curl -s -G "https://suggestqueries.google.com/complete/search" \
  --data-urlencode "client=chrome" --data-urlencode "hl=pt-BR" \
  --data-urlencode "gl=br" --data-urlencode "ie=utf-8" --data-urlencode "oe=utf-8" \
  --data-urlencode "q=<termo>"
```

**100 consultas em 5 rodadas.** O que a leitura vale e o que não vale:

- Não existe volume absoluto de graça. **Nenhum número de buscas/mês foi inventado neste relatório.**
- A força de um termo aqui é **qualitativa**: quantidade e especificidade das sugestões devolvidas. Termo que devolve 10–15 sugestões tem cauda viva; termo que devolve zero não tem massa crítica no autocomplete (o que não prova ausência de busca, só ausência de sinal).
- Google Trends não foi usado: o endpoint público devolve HTTP 429 (já validado nesta sessão — não insisti).
- Armadilha das siglas: "PSA" isolado puxa contexto errado; sempre desambiguei ("psa professional services automation", "o que é psa em software").

### Achados que decidiram a entrega

| Consulta | Sugestões devolvidas (amostra) | Leitura |
|---|---|---|
| `planilha de controle de horas trabalhadas` | 15 sugestões, incluindo `…por projeto`, `…excel download grátis`, `modelo de…`, `…google sheets` | **Termo mais forte de toda a pesquisa.** Cauda densa. Quem busca isso é exatamente quem o Pulse substitui. |
| `controle de horas por projeto` | `planilha de controle de horas por projeto`, `controle de horas de projeto excel`, `planilha de controle de horas trabalhadas por projeto` | Intenção 100% dominada por planilha/Excel. |
| `controle de horas trabalhadas por projeto` | `planilha…`, `controle de horas trabalhadas pdf`, `…gratuita`, `…grátis` | Confirma a anterior. |
| `sistema de controle de horas por projeto` | `sistema de controle de horas trabalhadas`, `sistema de controle de horas`, `planilha de controle de horas por projeto` | A intenção "sistema" existe e desemboca de novo em planilha. |
| `software de controle de horas gratuito` | `software para controle de horas trabalhadas grátis`, `software para controle de horas trabalhadas`, `software de controle de horas` | Demanda por ferramenta, com modificador "grátis" dominante. |
| `controle de horas trabalhadas app` | `app para controle de horas trabalhadas grátis`, `controle de horas aplicativo` | Idem, no mobile. |
| `o que é apontamento de horas` | `o que significa apontamento de horas`, `o que é apontamento de ponto` | **Confusão com ponto eletrônico** — precisa ser desambiguado no texto. |
| `como calcular o valor da hora de consultoria` | `como calcular valor hora de consultoria`, `como calcular a hora de consultoria`, `valor da hora de consultoria empresarial`, `consultoria valor hora` | Intenção clara de **preço de venda**, não de custo. |
| `valor hora de consultoria empresarial` | `…2023`, `…2024`, `valor hora consultoria estratégica` | Cauda com ano: gente procurando referência atualizada. |
| `como calcular o valor hora do meu serviço` | `como calcular o valor hora de serviços`, `como calcular a hora do meu serviço` | Mesma intenção, sem o recorte de consultoria. |
| `como calcular valor da hora de trabalho` | 15 sugestões (autônomo, freelancer, CLT, 12x36, hora extra…) | Termo forte, mas **ambíguo**: metade é trabalhista (hora extra, 12x36), não B2B. Exige recorte. |
| `markup para serviços` | `qual markup ideal para serviços`, `markup para empresas de serviços` | Confirma a dúvida markup × margem. |
| `como calcular preço de venda de serviço` | `…de serviços`, `…de uma empresa de serviços`, `planilha para calcular preço de venda de serviços` | Demanda de fórmula de formação de preço. |
| `como calcular impostos sobre serviço simples nacional` | `como calcular impostos simples nacional`, `…prestação de serviços`, `como calcular impostos sobre serviços` | Imposto é parte da conta do preço. |
| `quanto custa um funcionário clt para a empresa` | `…calculadora`, `…salário mínimo`, `custo de funcionário clt calculadora` | Termo forte, mas é **a mesma intenção** da página de custo hora que já existe. |
| `como calcular custo hora de funcionário` | `…com encargos`, `calcular custo hora funcionário` | Já coberto. |
| `como calcular encargos sobre a folha de pagamento` | 4 sugestões (`encargos sociais sobre a folha`, `todos os encargos…`) | Tema de contabilidade, tangente ao produto. |
| `psa professional services automation` | 11 sugestões, **todas em inglês e de players globais** (NetSuite, Certinia, Workday) | A sigla não tem demanda em pt-BR; a página existente vale como ativo de GEO/desambiguação, não de tráfego. |
| `o que é psa em software`, `o que é psa software` | **zero sugestões** | Confirma o acima. |
| `alternativa ao runrun.it`, `runrun.it preço`, `artia preço` | **zero sugestões úteis** (`artia preço` devolve "artia pratas") | **Não há demanda mensurável por comparação com concorrentes em pt-BR.** Página de comparativo seria trabalho inventado. |
| `como saber a rentabilidade de um cliente`, `lucratividade por cliente como calcular`, `como calcular margem por cliente` | zero ou genérico (`margem de lucro por produto`) | Tema sem massa própria de busca — está certo como **seção** dentro da página de agências, não como página. |
| `como calcular taxa de ocupação da equipe`, `horas faturáveis o que é`, `o que é taxa de utilização equipe` | sugestões fracas e desviadas (ocupação hoteleira, utilização de equipamento) | Conceito **sem demanda direta** em pt-BR: vira seção da página de valor hora, nunca página própria. |
| `software para agência de marketing`, `sistema de gestão para agência de publicidade` | 3–5 sugestões cada | Já coberto pelas páginas de persona. |
| `software de gestão para consultoria`, `…escritório de arquitetura`, `gestão de horas e custos de projeto` | zero ou genérico | Já coberto; sem sinal de nova intenção. |

Saída bruta completa das 5 rodadas: `/private/tmp/claude-501/.../scratchpad/r1.txt` … `r5.txt` (temporário da sessão). As 100 consultas rodadas estão listadas no §10 deste relatório.

---

## 6. Passo 4 — O que já existia

11 páginas de conteúdo, todas indexáveis, todas com FAQPage:

**(a) Já coberto, e bem** — não toquei:

| Página | Intenção que responde |
|---|---|
| `/o-que-e-psa` | Definicional. Sem demanda em pt-BR, mas é o ativo de GEO que ensina a categoria à IA. |
| `/controle-de-margem-por-projeto` | "como calcular margem de um projeto", "margem de lucro de um projeto". |
| `/o-que-e-margem-realizada` | Definicional, planejada × realizada × contábil. |
| `/custo-hora-de-funcionario` | "como calcular custo hora de funcionário com encargos". |
| `/alocacao-de-equipe-em-projetos` | Planejamento de horas e capacidade. |
| `/orcamento-de-projeto-com-margem` | Precificar **um projeto** a partir do custo. |
| `/software-de-gestao-para-consultorias`, `/software-para-agencias`, `/psa-para-software-house`, `/gestao-de-projetos-para-escritorio-de-arquitetura`, `/software-para-escritorio-de-engenharia` | Persona/segmento. |

**(b) Coberto raso** — resolvido por aprofundamento, sem página nova:

- "quanto custa um funcionário CLT para a empresa" (+ "calculadora"): termo forte, mas responde-se com o mesmo texto da página de custo hora. **Virou FAQ** naquela página, com o número do exemplo (R$ 8.000 de salário = R$ 12.800/mês) e a ressalva do Simples Nacional. Criar página para isso seria a página fina que o Google trata como scaled content abuse.
- Markup × margem: já estava na página de orçamento. Reforçado por referência cruzada, não duplicado.

**(c) Lacuna real** — as duas que viraram página (§7).

---

## 7. Passo 5 — As duas páginas criadas

### 7.1 `/controle-de-horas-por-projeto`

**Por que é intenção distinta:** nenhuma das 11 páginas trata do **registro** da hora. A de alocação trata do **planejamento** (quantas horas cada pessoa deveria fazer); a de margem realizada trata do **resultado**. Faltava o meio — o ato de apontar, que é justamente onde a demanda de busca está concentrada e onde o Excel ainda ganha.

**O que faz de diferente:**
- Desambigua **ponto eletrônico × planilha de horas × apontamento por projeto** numa tabela. O autocomplete mostrou que o próprio mercado confunde ("o que é apontamento de horas" → "o que é apontamento de ponto"). Essa tabela é o tipo de trecho que uma IA cita.
- Nomeia procedimento e regra, não adjetivo: lançar no fim do dia, fechar na sexta, envio trava os valores por projeto, correção posterior só por administrador com motivo registrado, lembrete automático no dia e horário configurados, alerta para gerentes com horas pendentes. Tudo isso **existe no produto** (`src/components/timesheets/`, `SubmitProjectDialog`, `AllocationCorrectionDialog`, `TimesheetReminderSettings`, edge functions `notify-timesheet-reminder` e `timesheet-alert-managers`).
- Assume a distinção do glossário: hora em projeto **cobra hora**, hora em atividade interna **desconta hora**.

**Intenções que absorve:** controle de horas por projeto · planilha de controle de horas por projeto · controle de horas de projeto excel · sistema/software de controle de horas trabalhadas · app para controle de horas trabalhadas · o que é apontamento de horas · o que é timesheet · como fazer timesheet · exemplo de timesheet.

### 7.2 `/valor-hora-de-venda-de-servicos`

**Por que é intenção distinta:** a página de custo hora responde *quanto a hora custa*; esta responde *quanto cobrar por ela* — e a própria FAQ da página de custo hora já dizia que não são a mesma coisa, sem ter para onde mandar o leitor. Também não se confunde com a página de orçamento: lá se precifica **um projeto com escopo**; aqui se monta a **tabela de preços por papel**, que é o insumo anterior.

**O que faz de diferente (o que faz uma IA citar):**
- Entrega a fórmula fechada logo no primeiro parágrafo: `valor hora = (custo hora ÷ taxa de ocupação) ÷ (1 − impostos − margem-alvo)`.
- Exemplo numérico completo e verificável: custo hora R$ 76,19 (o mesmo da página de custo hora, para as duas páginas fecharem entre si) ÷ ocupação de 70% = R$ 108,84; ÷ (1 − 0,10 − 0,35) = **R$ 197,89**; tabela a R$ 200,00, margem efetiva de 35,6%. E o contraste com o atalho errado: custo + 35% = R$ 102,86, que **não cobre nem o custo da hora vendável**.
- Trata a **taxa de ocupação** como a variável que quase ninguém mede — o conceito que o autocomplete mostrou não ter busca própria, mas que é o diferencial de quem tem apontamento de horas. É aqui que o Pulse tem dado e a planilha não tem.
- Liga ao produto pelo nome real da tela: **Tabela de Preços** do Portal do Admin, valor hora por papel e senioridade (júnior, pleno, sênior, especialista — `role_rates`).

**Intenções que absorve:** como calcular valor hora de consultoria · valor hora de consultoria empresarial · como calcular o valor hora de serviços · quanto cobrar por hora de consultoria/desenvolvedor/engenheiro/arquiteto · tabela de valor hora por profissional · markup para serviços · como calcular preço de venda de serviços.

### 7.3 Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/landing/slugs.ts` | +2 slugs: `VALOR_HORA`, `CONTROLE_HORAS`. |
| `src/landing/pages-guias.ts` | +2 páginas (`controleHoras`, `valorHora`), incluídas em `GUIDE_PAGES`; `related` de alocação, orçamento e margem realizada apontam para as novas (mantendo 3 links cada, que é o que a grade do "Leia também" comporta). |
| `src/landing/pages.ts` | Página de custo hora: FAQ nova ("Quanto custa um funcionário CLT para a empresa?"), resposta de valor hora × custo hora enriquecida, `related` passa a apontar para a nova página, `updatedAt` = 16/09/2026. |
| `src/test/landing-content-pages.test.ts` | **Novo.** Integridade das páginas públicas (não existia teste algum da landing). |
| `RELATORIO-SEO-GEO.md` | Este arquivo. |

Sitemap, `llms.txt`, rodapé, JSON-LD e pré-renderização **se atualizam sozinhos**: todos derivam de `CONTENT_PAGES`. Nenhuma arquitetura nova foi introduzida — o repo já previa "adicionar página = adicionar item em uma das três listas e o slug em `slugs.ts`", e foi exatamente o que fiz.

Resultado: **14 URLs indexáveis** (home + 13 páginas de conteúdo).

---

## 8. O que deliberadamente NÃO fiz

| Não fiz | Por quê |
|---|---|
| Página por palavra-chave (uma para "planilha de controle de horas", outra para "software de controle de horas", outra para "app de controle de horas"…) | As três se respondem com o mesmo texto. Uma página. Página fina em escala é scaled content abuse e dilui rastreio. |
| Página de comparativo com concorrentes ("alternativa ao Runrun.it", "Artia vs Pulse") | Autocomplete devolveu **zero** para essas consultas em pt-BR. Além disso, `src/landing/pages.ts` documenta a regra da casa: **sem citar concorrentes**. |
| Página sobre taxa de ocupação / horas faturáveis | Conceito sem demanda própria em pt-BR. Virou seção da página de valor hora, onde ganha contexto. |
| Página sobre "quanto custa um funcionário CLT" | Mesma intenção da página de custo hora. Virou FAQ lá. |
| Página sobre margem/rentabilidade por cliente | Sem massa de busca própria; já é seção da página de agências. |
| Página sobre encargos da folha | Tangente ao produto e território de contabilidade; o Pulse não é calculadora de encargos. Citado dentro da FAQ de custo hora, com a ressalva do Simples Nacional. |
| Landing de preço/planos | Não existe página de planos pública hoje e os valores não estão em `content.ts` — publicá-los é decisão comercial, não técnica. Ver §9. |
| Tocar em `robots.txt`, `vercel.json`, build, analytics ou qualquer coisa da área logada | Fora do escopo e, no caso de robots/analytics, sujeito a ADR. |
| Mexer em `/Users/italocastro/Projects/og-pulse` | Proibido pela instrução. Trabalhei só no worktree. |
| Commit, push ou troca de branch | Proibido pela instrução. |

---

## 9. Riscos e dúvidas para o revisor

1. **Números do exemplo de valor hora.** Usei imposto efetivo de 10% e margem-alvo de 35% como exemplo didático, e ocupação de 70%. São plausíveis e estão rotulados como exemplo, mas **não são recomendação da Origami**. Se o time quiser outros números de referência, é trocar as linhas da tabela.
2. **Faixa de ocupação "60% a 80%".** Escrevi como observação de mercado, sem citar fonte, e com a ressalva explícita de que "não existe número certo para copiar". Se o time tiver dado próprio (a Origami tem: é o Pulse), vale substituir por um número da casa — aí sim vira conteúdo que ninguém mais pode escrever.
3. **"Cerca de 45% de encargos".** É a mesma estimativa que a página de custo hora já usava no exemplo; mantive a coerência e acrescentei a ressalva do Simples Nacional. Se o time preferir não dar percentual algum, é remover uma frase.
4. **`related` alterados.** Tirei um link de cada uma de três páginas (software house de alocação, consultorias de orçamento, PSA de margem realizada) para caber os novos, porque a grade do "Leia também" é de 3 colunas. Todas as páginas removidas continuam a um clique pelo rodapé. Se o revisor preferir 4 links, o layout comporta, mas fica 3+1 desalinhado.
5. **Data de atualização.** As páginas novas nascem com `updatedAt: '2026-09-16'`; a de custo hora subiu para a mesma data porque o conteúdo mudou. As outras dez continuam em 09/09/2026, de propósito — não mexi no texto delas.
6. **Validação executada (worktree com `npm install` feito):**
   - `npm run build` → **verde**. `check-app-routes` (43 rotas), `check-tour-anchors`, `vite build` e prerender: **17 páginas geradas, 14 indexáveis** (eram 12). As duas novas saem com `<h1>`, canônica correta, `robots: index, follow`, JSON-LD com `FAQPage`, e entram sozinhas no `sitemap.xml` e no `llms.txt`.
   - `npx eslint` nos arquivos alterados → **sem avisos**.
   - `npx vitest run src/test/landing-content-pages.test.ts` → **6 testes, todos verdes**.
   - `npx vitest run` (suíte completa) → 363 de 364 testes passam. A única falha é **pré-existente e sem relação com esta entrega**: `src/test/allocation-hours-save.test.tsx` › "bloqueia edição de mês passado por não-admin", com `TypeError: can is not a function`. Os "unhandled errors" do relatório do vitest vêm de `src/integrations/supabase/client.ts` chamando `createClient` sem `VITE_SUPABASE_URL` — o worktree não tem `.env.local`. Nenhum dos dois toca em `src/landing/`. **Vale um olhar do time nesse teste quebrado**, independente deste PR.
7. **Dúvida de produto, para o Italo:** a home promete "teste grátis de 14 dias" e o `sobre-pulse.md` fala em trial de 30 dias para a persona Carlos e em 4 planos com preço. **Não existe página pública de planos.** "quanto custa" é uma intenção comercial clássica e hoje o site não responde — mas publicar preço é decisão de negócio. Se o time quiser, a página `/precos` é a próxima candidata natural, e ela se monta com o mesmo mecanismo, sem código novo.

---

## 10. Anexo — as 100 consultas rodadas

**Rodada 1 (categoria e produto):** software de gestão para consultoria · sistema de gestão para consultoria · software para agência de marketing · sistema de gestão para agência de publicidade · software de gestão para escritório de arquitetura · software para escritório de engenharia · psa professional services automation · o que é psa software · gestão de projetos rentabilidade · como calcular margem de projeto · como calcular custo hora de funcionário · custo de funcionário clt para empresa · quanto custa um funcionário clt para a empresa · como precificar serviço de consultoria · quanto cobrar por hora consultoria · como calcular hora técnica · controle de horas por projeto · sistema de apontamento de horas · software de timesheet · planilha de controle de horas trabalhadas

**Rodada 2 (preço, honorários e capacidade):** como calcular valor da hora de trabalho · como definir o valor da minha hora · como calcular valor hora de venda de serviço · quanto cobrar por hora de trabalho freelancer · tabela de honorários arquitetura · quanto cobrar por projeto de arquitetura · como calcular honorários de engenharia · planilha de rentabilidade por projeto · planilha de custo de projeto · como saber se um projeto deu lucro · margem de lucro de agência de marketing · quanto cobrar de fee mensal agência · como fazer gestão de agência de marketing · erp para prestadora de serviços · sistema para empresa prestadora de serviços · como calcular taxa de ocupação da equipe · o que é taxa de utilização equipe · horas faturáveis o que é · como calcular capacidade da equipe · software de gestão de projetos para consultoria

**Rodada 3 (concorrência, timesheet e formação de preço):** planilha de margem de lucro por projeto · como controlar as horas da equipe · melhor sistema de gestão de projetos · alternativa ao runrun.it · runrun.it preço · artia preço · quanto custa um software de gestão de projetos · o que é timesheet · apontamento de horas o que é · como fazer timesheet · como calcular encargos sobre a folha de pagamento · percentual de encargos sobre salário clt · como calcular preço de venda de serviço · formação de preço de venda de serviços · gestão financeira de agência de marketing · gestão financeira para consultoria · indicadores de uma agência de marketing · como organizar uma consultoria · o que é margem de contribuição · software para controle de projetos e horas

**Rodada 4 (validação das duas hipóteses):** como controlar horas trabalhadas por projeto · controle de horas trabalhadas por projeto · como fazer controle de horas dos funcionários · sistema de controle de horas por projeto · como calcular o valor da hora de consultoria · como definir o valor hora de consultoria · valor hora de consultoria empresarial · como calcular o valor hora do meu serviço · quanto cobrar por hora de programação · quanto cobrar por hora engenheiro civil · como calcular hora técnica de engenharia · tabela de valor hora por profissional · quantas horas úteis tem um mês · horas produtivas por mês funcionário · scope creep o que é · como controlar o orçamento de um projeto · projeto estourou o orçamento · como acompanhar custos de um projeto · quanto cobrar por hora de consultoria de marketing · valor hora de trabalho como calcular empresa

**Rodada 5 (prefixos de intenção e modificadores):** o que é apontamento de horas · qual o melhor sistema de controle de horas · vale a pena usar timesheet · software de controle de horas gratuito · controle de horas trabalhadas app · como calcular quanto cobrar pela hora da minha equipe · markup para serviços · como calcular impostos sobre serviço simples nacional · quanto cobrar consultoria de ti por hora · quanto cobrar por hora arquiteto · modelo de planilha de apontamento de horas · exemplo de timesheet preenchido · o que é psa em software · professional services automation o que é · como saber a rentabilidade de um cliente · lucratividade por cliente como calcular · como calcular margem por cliente · gestão de horas e custos de projeto · software de gestão de projetos com controle de custos · sistema de gestão para empresa de serviços
