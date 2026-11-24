# US-0014 — Fit por serviço que separa as contas: tamanho real, dívida, distância e faturamento

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 24/11/2026 ("pode começar a US-0014")
- **Relacionadas:** US-0006, US-0007, US-0015, US-0018, US-0022, US-0038, ADR-0042, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** um fit para cada serviço da Origami, que use o tamanho real da empresa, a dívida
ativa, a distância de Formiga e o faturamento,
**para** saber, já na Qualificação, qual serviço oferecer a cada conta, e para que a ordem da
Base separe de verdade as melhores contas para cada serviço.

### Contexto

Diagnóstico de 23/11/2026:

- **Na Base,** o "fit prévio" usa só o CNAE e a idade (todas são médias ou grandes): 1,7
  milhão de empresas têm nota 50, e a ordem padrão da tela perde o sentido.
- **No Pulse,** a mesma conta tem o porte "média ou grande" fixo: Consultoria (40 + 20 de
  indústria + 15 de idade) e Software (40 + 25 + 10) dão 75 para quase toda indústria com mais
  de 5 anos. O indício N do BANT (fit 60 ou mais) valia para todas — por isso a US-0038 tirou os
  indícios da entrada em "Oportunidade qualificada".
- **Os dados que separam as empresas moram na VPS** (ADR-0053): funcionários da RAIS, dívida
  ativa da PGFN, distância de Formiga e faturamento estimado. As empresas do Pulse não têm
  nenhum deles.

### Escopo

- Inclui: quatro sinais novos na nota, cada ponto com o motivo escrito, sem IA (ADR-0042):
  **funcionários** (RAIS, ou os confirmados pelo time), **dívida ativa ajuizada** (tira pontos),
  **distância de Formiga** e **faturamento ou tipo de conta**.
- Inclui: **porte e idade com peso pequeno** (piso), porque não diferenciam a Base.
- Inclui: **retrato da Base na empresa do Pulse**: ao mover para qualificação (ou importar
  CNPJ), a empresa guarda funcionários da RAIS, dívida ajuizada, distância e faturamento
  estimado, com a data do retrato; o retrato se atualiza depois de cada carga da Base.
- Inclui: **um fit por serviço**, nas linhas de serviço da Origami: Studio de Produto (software
  e integração), Lei do Bem, Captação de recursos (FINEP, BNDES, FAPs) e Consultoria
  Estratégica. "Financiamento de inovação" se divide em Lei do Bem e Captação, que têm regras
  diferentes. Ventures fica sem fit (é investimento, não perfil de conta).
- Inclui: onde aparece:
  - **Em qualificação:** as notas dos quatro serviços lado a lado, com a maior em destaque;
  - **Estudo da conta:** o fit de cada serviço com os motivos;
  - **Base de empresas:** escolher o serviço ("melhores para Lei do Bem"), e a lista ordena e
    filtra pelo fit dele (a carga grava uma nota por serviço na VPS);
  - **Cartão do Pipeline:** o serviço de maior fit, em letra pequena;
  - e a ficha, o MCP e o indício N do BANT (maior fit), com a mesma regra.
- Inclui: ADR novo, porque muda o ADR-0042 (pesos; o faturamento passa a entrar na nota) e o
  ADR-0053 (o retrato de alguns números da Base fica no Supabase).
- Não inclui: recalibrar os pesos com Ganhos e Perdas (história futura, já prevista no
  ADR-0042); IA na nota.

### Pesos (aprovados em 23/11/2026, ajustados para cada serviço fechar em 100)

Cada serviço vai de 0 a 100; a soma dos máximos de cada coluna é exatamente 100. A dívida só
tira pontos (não entra no máximo). Empresa inativa: 0. Sem dados da Receita: sem nota.

| Sinal | Studio de Produto | Lei do Bem | Captação de recursos | Consultoria Estratégica |
|---|---|---|---|---|
| Indústria (principal / secundária) | 30 / 18 | 15 / 8 | 15 / 8 | 15 / 9 |
| Funcionários 50–99 / 100–249 / 250–999 / 1.000+ | 5 / 10 / 20 / 25 | 4 / 8 / 12 / 15 | 4 / 8 / 12 / 15 | 8 / 15 / 22 / 25 |
| Satélite / Ponte / Âncora (ou a faixa do faturamento) | 6 / 12 / 15 | 4 / 8 / 10 | 3 / 6 / 8 | 6 / 12 / 15 |
| Distância de Formiga até 150 km / até 300 km | 5 / 2 | — | — | 15 / 8 |
| Minas Gerais (FAPEMIG) | — | — | 10 | — |
| Porte média ou grande (piso) | 5 | 2 | 2 | 5 |
| Idade | 5 (5+ anos) | 3 (3+ anos) | 10 (3+ anos) | 5 (5+ anos) |
| Regime: Lucro Real / não informado | — | 35 / 10 | — | — |
| Site: cita sistema / sinais de fábrica | 10 / até 5 | — | — | — |
| Site: P&D ou inovação | — | 10 | 15 | — |
| Site: ISO ou exportação | — | — | — | até 10 |
| Lei do Bem: Lucro Real e nunca usou / já usa | — | 10 / 5 | — | — |
| Já captou fomento (FINEP, BNDES) | — | — | 15 | — |
| Contratos com o governo federal | — | — | 10 | 10 |
| **Soma dos máximos** | **100** | **100** | **100** | **100** |
| Dívida ativa ajuizada | −5 | −25 | −30 (CND obrigatória) | −10 |

Regra própria: **fora do Lucro Real, a Lei do Bem é 0** ("só vale para o Lucro Real"), como a
empresa inativa. **Na Base, o regime desconhecido não soma** (revisão de 24/11/2026): lá o regime
nunca é consultado, e os 10 pontos de "não informado" faziam a Lei do Bem virar o maior fit de
1,95 milhão de empresas; no Pulse, "não informado" (a BrasilAPI respondeu sem regime) vale 10.
**Abaixo de 20, nenhum serviço se destaca** (24/11/2026): a maior nota sai de pontos que quase
toda empresa tem (porte, idade), então a tela não aponta "serviço de maior fit" (cartão, Em
qualificação, dica da Base); a ordem pela maior nota não muda.

Na Base (sem regime, site, fomento nem governo), os máximos ficam em 85 (Studio), 45 (Lei do
Bem), 60 (Captação) e 80 (Consultoria): o resto vem do que só se descobre no Pulse.

## Critérios de aceite

**Cenário 1: a Base ordena por quem importa**

- **Dado** a próxima carga da Base com a regra nova;
- **Então** o fit prévio deixa de se concentrar numa nota só, e a ordem padrão traz primeiro
  indústrias maiores, perto de Formiga e sem dívida ajuizada.

**Cenário 2: cada ponto se explica**

- **Quando** abro o fit de uma empresa (ficha da Base ou da empresa no Pulse);
- **Então** vejo cada ponto com o motivo, inclusive "250–999 funcionários (RAIS)", "Dívida
  ativa ajuizada: −25 (FINEP e BNDES pedem CND)", "A 120 km de Formiga" e "Âncora".

**Cenário 3: a empresa leva o retrato para o Pulse**

- **Dado** uma empresa movida da Base para qualificação;
- **Então** ela guarda funcionários, dívida ajuizada, distância e faturamento estimado, com a
  data do retrato, e a nota no Pulse usa esses números.

**Cenário 4: o time corrige**

- **Dado** funcionários confirmados pelo time (US-0020) ou faturamento informado;
- **Então** eles valem no lugar da RAIS e da estimativa, na nota também.

**Cenário 5: o retrato se atualiza**

- **Dado** uma carga nova da Base;
- **Então** o retrato das empresas que estão no Pulse é refeito, e a data muda.

**Cenário 6: sem retrato**

- **Dado** uma empresa do Pulse sem retrato (cadastrada antes, ou fora da Base);
- **Então** a nota usa o que houver, e os sinais que faltam não somam nem tiram — "não sei" não
  é "não serve" (ADR-0042).

## Decisões (Victor Couto, 2026-11-23)

- Entram funcionários (RAIS), dívida ativa ajuizada, distância de Formiga e faturamento ou tipo
  de conta.
- Porte e idade ficam com peso pequeno (recomendação aceita).
- O retrato da Base é guardado na empresa ao entrar no Pulse (recomendação aceita).
- Pesos propostos agora; recalibrar com Ganhos e Perdas depois (recomendação aceita).
- Cada serviço fecha em 100 no máximo (pedido do Victor).
- Um fit por serviço, quatro serviços: Studio de Produto, Lei do Bem, Captação de recursos e
  Consultoria Estratégica (recomendação aceita).
- Aparece em Em qualificação, Estudo da conta, Base (ordenar e filtrar por serviço) e cartão do
  Pipeline.

## Pontos em aberto

### Hipóteses para validar

- 150 e 300 km como faixas de distância para consultoria presencial.
- Dívida ajuizada (não a dívida total) como o sinal que importa para FINEP e BNDES.

### Provocações para produto

- O faturamento entra na nota e também no tipo de conta e no Budget do BANT — impacto possível:
  a mesma informação pesa três vezes na decisão; por isso o peso dele no fit é moderado (até 15).

## Contexto técnico

- **Mudança de chave:** as frentes `software | financiamento | consultoria` (`FitFront`) viram
  `studio | lei_do_bem | captacao | consultoria`; a coluna `fit_frente` da VPS e os filtros
  guardados no navegador precisam aceitar a troca (o filtro antigo vira o novo ou é ignorado).
- **Comportamento atual:** PROVADO — regras em `src/lib/prospecting/fit.ts`
  (`softwarePontos`, `financiamentoPontos`, `consultoriaPontos`, `companyFit`, `bestFit`);
  fit prévio da Base em `fitDaBase.ts`, gravado pela carga (`scripts/receita/sincronizar-base.ts`,
  coluna `fit_previo`); dados da Base em `pulse.empresas` na VPS; o MCP importa os mesmos
  módulos.
- **Mudanças no banco:** migration nova, com rollback: colunas do retrato em
  `prospect_companies` (funcionários da RAIS, dívida ajuizada, distância, faturamento estimado e
  base, data do retrato); sem policy nova (herdam as da empresa). Na VPS, colunas com a nota de
  cada serviço (e índices para ordenar por elas) em `esquema.sql`, recalculadas pela carga, além
  do `fit_previo` (a maior) e do `fit_frente`.
- **Atualização do retrato:** a `empresas-receita` (que lê a VPS) ganha um modo que refaz o
  retrato das empresas do tenant; chamado depois de cada carga.
- **Restrições:** ADR novo antes de implementar; a mesma regra na tela, no MCP e na carga
  (TD-0022); nenhum faturamento de empresa no repositório.
- **Provas esperadas:** distribuição do fit prévio antes e depois da carga; os motivos na ficha;
  o retrato gravado ao mover; a correção do time valendo; o retrato atualizado.
- **Fora do escopo:** recalibrar com Ganhos e Perdas; IA.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | carga aplicada na Base em 24/11/2026 (2.438.184 empresas): o fit prévio deixa de concentrar 1,7 milhão em 50 — 413 mil em 0–9, 1,74 milhão em 10–19, 198 mil em 20–29, 35 mil em 30–39, 41 mil em 40–49, 8,9 mil em 50–59, 3,3 mil em 60–69, 2,1 mil em 70–79 e 265 em 80+; conferido na VPS: as quatro notas preenchidas e `fit_previo` igual à maior delas em todas as linhas |
| 2 a 6 | validação manual do Victor em 24/11/2026 ("testei, tudo passou"): filtro e ordem por serviço na Base, ficha com os motivos (dívida em negativo), quatro notas em Em qualificação, Estudo da conta e cartão do Pipeline; testes desativados |
| Retrato | primeiro retrato em 24/11/2026: 1.466 empresas do Pulse com CNPJ, 1.171 encontradas na Base (917 com funcionários, 445 com dívida ajuizada) |

- Regra: `src/lib/prospecting/fit.ts` (quatro serviços, `sinaisDaEmpresa`, `servicoEmDestaque`,
  `FIT_QUE_DESTACA`), `fitDaBase.ts` (`linhaParaFit`, regime não consultado na Base).
- Base: colunas e índices por serviço em `scripts/receita/vps/esquema.sql`; a carga
  (`sincronizar-base.ts`) calcula faturamento e distância antes do fit; a `empresas-receita`
  ordena e filtra pelo serviço escolhido (`servicoDoFit`, `fitMinimo`); painel de filtros com
  "Fit por serviço"; coluna de fit da tabela pelo serviço.
- Pulse: retrato gravado ao mover (`retratoDaLinha`, `setRetratoDaBase`); Em qualificação com as
  quatro notas; Estudo da conta com o fit de cada serviço (`FitPorServico`); cartão do Pipeline
  com o serviço em destaque.
- Banco: migration `20261124160000_retrato_da_base` (colunas, `atualizar_retrato_da_base`, tarefa
  de segunda-feira), com rollback; Edge Function `retrato-da-base`.
- ADR-0055.
