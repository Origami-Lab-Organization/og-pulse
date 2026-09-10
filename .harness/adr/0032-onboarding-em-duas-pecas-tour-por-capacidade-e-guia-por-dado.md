# ADR 0032: Onboarding em duas peças — tour recortado por capacidade e guia com progresso derivado do dado

- Status: aceito
- Data: 2026-09-10
- Decisores: Italo Castro (produto), Origami Lab
- Relacionados: ADR-0027 (capacidade derivada de papel), ADR-0031 (centro de custo como âncora), PUL-206 (padrão de produto como dado)

## Contexto

Quem se cadastra em `/register` cria a empresa e caía num produto vazio: sem centro de custo,
sem linha de serviço, sem encargos, sem pessoa, sem cliente. Os dois onboardings que existiam
falavam com o colaborador convidado (Caixa de Entrada, Kanban) e estavam parcialmente mortos:
o `OnboardingModal` declara quatro alvos de holofote que nunca receberam o atributo no DOM, e
o tour da timesheet tem um corte por data em 01/08/2026 que já passou. O roadmap chama a
lacuna de "time-to-first-insight ≤ 7 dias".

A referência era o projete.app, que tem um tour de popovers (driver.js) e um checklist de
ativação separado. A investigação mostrou o que funcionou lá e o que doeu:

- o tour nasceu monolítico e o convidado caía num tour de dono; a segmentação por perfil só
  veio depois de olhar o Amplitude, e teve de ser adivinhada por heurística de tempo;
- passo cujo seletor não existe é filtrado em silêncio, e foi assim que a copy de um passo
  sumiu quando o painel foi reescrito — sem quebrar teste nenhum;
- o progresso do tour fica no browser, e trocar de navegador reexibe tudo.

Decisões tomadas pelo produto em 10/09: tour com holofote sobre a UI real (não wizard em
tela cheia); empresa nova recebe só a base do produto, sem dado de exemplo; consertar os
onboardings antigos junto.

## Decisão

### 1. Duas peças, porque são duas perguntas

O **tour** apresenta a casa em dois minutos, na primeira entrada, e conclui por clique. O
**guia de primeiros passos** acompanha a montagem da empresa ao longo de dias e só fecha
quando o dado existe. Convivem no `AppLayout`. Uma peça só que tentasse ser as duas — como o
`OnboardingModal` tenta — não é boa em nenhuma: tour que exige cadastro para avançar vira
prisão, e checklist que conclui por clique mente.

### 2. O tour é recortado por capacidade, pela mesma fonte que o menu

Cada passo declara `requiresCapability` (e `hiddenWhenCan` para os pares que se excluem),
e o filtro usa `hasAnyCapability` — a função que monta o menu lateral. Quem não vê o item de
navegação não ouve falar dele. Não se adivinha perfil por heurística: a capacidade é dado
(ADR-0027) e é a mesma que a RLS aplica.

O gate de build `check:tour` prova que um passo que apresenta tela restrita exige a
capacidade que o item de menu exige. Quebrar isso quebra o build, não o teste.

### 3. O progresso do guia é derivado do dado real e nunca persistido

Cada passo tem um `isDone(counts)` sobre contagens reais (pessoas, clientes, serviços,
projetos com time, horas). Não existe "passo atual" gravado em lugar nenhum. Quem cadastra
um cliente por qualquer caminho vê o passo fechar; quem apaga tudo vê reabrir. Não há estado
para dessincronizar. Só a preferência de dispensar é gravada, no banco, para valer entre
dispositivos. O guia só aparece para quem tem `configuracao:editar`.

### 4. Alvo ausente nunca faz o passo desaparecer

Passo do tour sem âncora visível vira card centralizado com `fallback` textual; passo do guia
mostra o caminho por escrito. Âncoras são `data-tour` geradas por template em **todos** os
ramos da navegação (link, grupo recolhido, grupo aberto, filha), e o gate `check:tour` falha
se um seletor não tiver rota correspondente ou se o template deixar de existir. Provado
sabotando as duas pontas.

### 5. Estado de onboarding em consulta separada, com falha tolerada

Nenhuma coluna de onboarding entra no `select` que monta a sessão. Aconteceu uma vez, com a
migration ainda não aplicada, e o PostgREST recusou a consulta inteira: todo usuário viu "não
encontramos um funcionário ativo". Regra que fica: campo acessório se lê em consulta própria,
e erro ou coluna ausente viram "já viu" / "dispensado". Um acessório nunca derruba o login
nem abre overlay por cima de quem trabalha só porque não conseguiu confirmar nada.

Abrir e persistir são independentes: o estado local do React Query manda no que a tela faz
agora, a RPC só registra para o outro dispositivo, e falha na gravação vira aviso.

### 6. A base do produto vem por trigger, como dado de catálogo

Empresa nova nasce com centros de custo genéricos, uma linha de serviço e os encargos do
Simples Nacional, via `default_cost_centers`, `default_service_lines` e
`seed_tenant_defaults`, seguindo PUL-206. Idempotência por "o tenant já tem algum", não por
nome: quem renomeou o centro não recebe os genéricos de volta. Não é dado de exemplo; é o
padrão do produto, e o cliente edita.

### 7. O tsuru é o anfitrião, articulado e só com tokens

O personagem da casa deixa de ser exclusivo da 404. É SVG articulado (asas, pescoço e cauda
como grupos com origem na junta), com estados (pousado, voando, comemorando), dobra de
entrada, gestos aleatórios em repouso e voo em curva entre alvos (`offset-path`). Tudo em
tokens do tema, tudo escopado sob `[data-crane-state]` para não disputar com o CSS da landing,
e tudo parado sob `prefers-reduced-motion`.

## Consequências

- Benefícios: cada perfil recebe um tour do tamanho da sua realidade; o guia nunca mente
  sobre progresso; código morto de onboarding passa a quebrar o build em vez de sumir
  calado; a empresa nova já calcula no primeiro dia.
- Custos: seis contagens por carga do app para o dono com passo pendente (`head: true`,
  só o total); três migrations a aplicar; o tour depende de `offset-path`, que degrada para
  posição final sem animação em navegador antigo.
- Riscos: `check:tour` lê os arquivos por regex, então uma refatoração grande do formato de
  `sidebar-nav.ts` ou `tour.ts` pode exigir ajuste do gate; a heurística de "quem administra"
  é `configuracao:editar`, e mudar essa capacidade muda quem vê o guia.
- Como reverter: rollbacks em `supabase/rollback/20260910140000`, `...150000` e `...160000`;
  remover `<GuidedTour />` e `<OwnerGuide />` do `AppLayout` desliga as duas peças sem tocar
  no resto.

## Pendências registradas

- Os dois onboardings antigos (`OnboardingModal` sem âncoras, tour da timesheet com corte por
  data) ainda não foram consertados nem removidos; decisão aprovada em 10/09, trabalho por
  fazer.
- As três migrations não estão aplicadas em produção.

## Evidências

- Jira: PUL-249 (base do produto), PUL-250 (guia), PUL-251 (tour), PUL-252 (tsuru vivo);
  incidente do login registrado em PUL-250 e no commit `2ef96d0`.
- Migrations: `20260910140000_tenant_base_defaults.sql`, `20260910150000_owner_guide.sql`,
  `20260910160000_guided_tour.sql`, com rollbacks.
- Prova da base do produto em Postgres 15 com os triggers reais: seis cenários, incluindo
  no-op na Origami e idempotência por presença.
- Gate: `scripts/check-tour-anchors.mjs`, no `npm run build`; sabotado em quatro cenários
  (seletor sem rota, template removido, passo sem capacidade, rota inexistente).
- Investigação do projete.app e dos onboardings existentes, 10/09/2026, na conversa de
  origem: driver.js sem mascote, âncoras `data-onboarding` inexistentes, `HARD_CUTOFF`
  em `useTimesheetOnboarding.ts`.
