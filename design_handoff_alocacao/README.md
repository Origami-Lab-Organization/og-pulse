# Handoff — Refatoração da Tela de Alocação (`/alocacao`) · Origami Pulse

> **Módulo:** Projetos · **Rota:** `/alocacao` + nova rota de detalhe `/alocacao/:employeeId`
> **Este pacote complementa** o `prompt-refatoracao-tela-alocacao.md` (spec funcional) e o `prompt-refatoracao-aba-equipe.md`. A spec manda nas regras de negócio; **este README manda no visual** (layout, tokens, estados). Onde houver conflito, a spec funcional prevalece para dados/fórmulas/permissões; este documento prevalece para aparência.

---

## 1. Overview

Refatoração da visão consolidada de utilização por colaborador. Objetivo de produto: **o GP abre `/alocacao` e em 30 segundos identifica quem está sobrecarregado, atrás do lançamento e subalocado**, nos próximos meses.

Duas telas neste handoff:
1. **Tabela de alocação** (direção **1b — "Scan 30s"**): linha densa, agrupada por severidade, com heatmap nas colunas futuras.
2. **Detalhamento do colaborador** (**2a — Drawer** como padrão + link "abrir em tela cheia" para **2b — Tela dedicada** `/alocacao/:employeeId`).

## 2. Sobre os arquivos deste pacote

Os arquivos em `prototipo/` são **referências de design feitas em HTML** — um protótipo que mostra aparência e comportamento pretendidos, **não código de produção para copiar**. A tarefa é **recriar estes designs no codebase do Pulse** (React + TypeScript, Tailwind com tokens semânticos, shadcn/ui, TanStack Query, Supabase), usando os componentes e padrões já existentes ali.

- Prototipo é uma peça única em formato "Design Component" (um HTML que abre no navegador). As 3 direções da tabela (1a/1b/1c) e as 2 do detalhe (2a/2b) estão empilhadas num canvas de opções. **Implementar: tabela 1b + drawer 2a + tela 2b.**
- Abra `prototipo/Alocacao - Variacoes.dc.html` no navegador para ver e interagir.

## 3. Fidelidade

**Alta (hifi).** Cores, tipografia, espaçamento e hierarquia são finais e seguem o **Origami Lab Design System**. Recriar pixel-a-pixel usando os componentes do codebase. Os únicos placeholders: os ícones `✎` (editar) e `🔒` (bloqueado) no protótipo devem virar **ícones Lucide** (`pencil`, `lock`) — o DS não usa emoji.

---

## 4. Design Tokens (Origami Lab)

Usar os tokens semânticos do Tailwind já presentes no Pulse. Valores canônicos:

### Cores
| Uso | Token / hex |
|---|---|
| Página (bg) | `#F2F2F0` (paper) |
| Superfície card | `#FFFFFF` / `#FBFBF9` |
| Superfície afundada | `#F6F7EB` (ivory) / `#EFF0E8` |
| Borda hairline | `#DEE0D0` |
| Divisória interna | `#EFF0E8` |
| Texto principal | `#1A1A1A` |
| Texto secundário | `#54564E` |
| Texto fraco / muted | `#8A8C7E` |
| Texto desabilitado | `#B9BAAC` |
| Primária (ações) | `#0C7E54` · hover `#0A6B47` |
| Link / accent on light | `#0B7350` |
| Tint emerald | `#E8F1EC` (avatar bg, mist) |

### Cores de status de utilização (a régua central — **fonte única `getUtilizationStatus`**)
| Faixa % capacidade | Status | Cor | Tint fundo |
|---|---|---|---|
| < 70% | `subalocado` | `#2D4A4C` (petróleo/info) | `rgba(45,74,76,.08–.10)` |
| 70–90% | `saudavel` | `#0B7350` (verde) | `rgba(11,115,80,.09)` |
| > 90–105% | `cheio` | `#C2810C` (âmbar) | `rgba(194,129,12,.10–.12)` |
| > 105% | `sobrecarga` | `#C2410C` (vermelho) | `rgba(194,65,12,.09–.10)` |

> Subalocado é **petróleo/azul, nunca verde nem neutro**. 100% = `cheio` (âmbar), não "saudável". Ausência de badge = estado saudável (não criar badge verde).

### Tipografia
- **Lexend Exa** (display): títulos, eyebrows, labels de coluna. Eyebrows em UPPERCASE, `letter-spacing: .12em`, 9–10px, weight 600.
- **Plus Jakarta Sans** (corpo/UI): nomes, cargos, textos. 11–14px.
- **Space Grotesk** (mono): **todos os números** (%, horas, deltas) com `font-variant-numeric: tabular-nums` e `letter-spacing: -0.02em` nos grandes.

### Espaçamento / forma
- Base 4px. Raios: 6/8/12px em cards e chips; **pill (`999px`) só em CTAs e badges**.
- Cards flat (sem sombra em repouso). Drawer usa `box-shadow: -16px 0 40px rgba(26,26,26,.18)`.
- Borda emerald 1.5px + anel `0 0 0 3px rgba(12,126,84,.10)` no campo em foco/edição.

---

## 5. Tela 1 — Tabela de Alocação (direção 1b)

### 5.1 Layout
- **Barra de temperatura** no topo (substitui os cards de KPI): faixa horizontal segmentada proporcional às contagens de status do mês vigente (sobrecarga · cheio · saudável · subalocado), cada segmento com a cor do status e a contagem em branco. À direita, chips-resumo (`3 sem lançamento`, `2 atrás do ritmo`) e o agregado `104% · 3.588h/3.450h`. Clicar num segmento filtra a tabela.
- **Tabela** em grid de colunas: `Pessoa (250px, sticky) | Mês vigente | +3 meses futuros | chevron (32px)`. Navegação horizontal (‹ ›) avança a janela (até 6 meses futuros / meses passados).
- **Cabeçalho de coluna:** mês vigente com `JUL · 23d` (dias úteis) e badge "vigente"; subtítulo padronizado **"plan / capacidade"** em todas as colunas. Mês vigente também mostra "carga · lançado".
- **Agrupamento por severidade:** banda de grupo (`SOBRECARGA · N`, `ATRÁS DO RITMO · N`, `SUBALOCADO · N`, `EM ORDEM · N`) com dot colorido; cada linha do grupo tem **trilho colorido de 3px à esquerda** (`border-left`) na cor do status. O grupo + trilho substituem o badge textual da linha.
- **Densidade:** linha de ~54px (modo compacto). Toggle compacto/confortável no header. Alvo: 19 pessoas visíveis com rolagem mínima.
- **Rodapé:** totais do tenant por mês (`Σplan / Σcap` + %).

### 5.2 Célula do mês vigente (execução)
Da esquerda para a direita, numa linha:
1. **% de carga** em chip com tint do status (`152%` em fundo `rgba(194,65,12,.10)`, cor `#C2410C`), Space Grotesk 12.5px.
2. **Mini-barra ancorada** (70px × 5px): trilho `#EFF0E8`, preenchimento = `realizado/planejado` na cor do status, **marcador vertical escuro (`#1A1A1A`, 1.5px)** na posição do pró-rata (`dias_úteis_decorridos / dias_úteis_mês`). Tooltip do marcador: "Esperado até hoje: Nh".
3. **Lançado + desvio pró-rata** em texto: `0h · sem lanç.` / `24h · −14h ritmo` / `20h · em dia`. Regras: "em dia" se desvio ≥ −4h; "Nh atrás do ritmo" se < −4h; "sem lançamento" se realizado=0 e pró-rata>0.
4. **Nº de projetos** (`4 proj`) alinhado à direita, muted, link → abre o drawer.

### 5.3 Célula de mês futuro (capacidade) — heatmap
- Pílula/retângulo com **wash de cor do status** (`rgba` do tint da faixa) preenchendo a célula.
- **Protagonista: horas livres** (`+128h`, `0h`, `−112h`) em Space Grotesk 13.5px, cor do status.
- **Coadjuvante:** `%` ao lado, menor, muted. `plan/cap` no tooltip.
- **Sem rótulos textuais de status** — cor + tooltip apenas.

### 5.4 Filtros e ordenação
- Busca por nome; filtros: pessoa, projeto, cargo, status, período. Toggle "Mostrar desligados". Exportar CSV.
- Ordenação default: **severidade do mês vigente** (sobrecarga → sem lançamento → atrás do ritmo → subalocado → ok), depois alfabética. Alternativas: nome, % de carga, horas livres do próximo mês.

### 5.5 Referências visuais
`screenshots/01-shot.png`. Linha do protótipo: bloco "1b".

---

## 6. Tela 2 — Detalhamento do colaborador

**Padrão: Drawer (2a).** No cabeçalho do drawer, botão/ícone "abrir em tela cheia" → navega para `/alocacao/:employeeId` (**Tela dedicada 2b**), preservando o mês selecionado. Mesmos dados, mesmas regras de permissão nos dois.

### 6.1 Drawer (2a) — `Sheet` do shadcn, lado direito, ~512px
- **Overlay:** backdrop `rgba(26,26,26,.28)` sobre a tabela (que permanece atrás, desfocada/esmaecida).
- **Cabeçalho:** avatar (44px, `#E8F1EC`/`#0B7350`), nome (16px/700), cargo + jornada (`8h/dia`), botão fechar. Abaixo, **navegador de meses** ‹ › com 4 pílulas (mês vigente destacado em `#1A1A1A`, % na cor do status).
- **Resumo do mês** (fundo `#F6F7EB`): % de carga grande (28px, cor do status) + `plan / cap`; ao lado, ritmo (`0h lançado · sem lançamento`, mini-barra com marcador de pró-rata, "esperado até hoje: 61h"). Linha com badge de status + `Livres: −96h (cap − Σplan)`.
- **Breakdown por projeto** (uma linha por projeto + uma "Atividades internas"): nome do projeto (link `↗` → `/projects/:id`) + `cliente · papel`. Três campos: **Planejado** (editável condicional), **Lançado** (sempre read-only), **Δ** (colorido).
- **Rodapé** (`#F6F7EB`): `Σ planejado / capacidade` + `livres` colorido. Botões pill: **Salvar correções** (primária `#0C7E54`) e **Ver no projeto** (outline).

### 6.2 Tela dedicada (2b) — rota `/alocacao/:employeeId`, container ~1180px
Tudo do drawer, mais o espaço para:
- **Breadcrumb** `‹ Alocação / Nome`.
- **Header do colaborador** (avatar 56px, nome 20px, cargo·jornada·squad) + carga do mês grande à direita.
- **Tendência de carga · 6 meses:** 6 barras verticais clicáveis (altura ∝ %, cor do status), mês vigente destacado com trilho escuro + anel. Clicar troca o mês detalhado.
- **Corpo em 2 colunas:** esquerda = tabela de breakdown (`Projeto | Planejado | Lançado | Δ` + linha de total com reconciliação); direita (rail `#F6F7EB`) = **painel de ritmo** (barra com marcador, "61h atrás do ritmo") + **histórico de correções** (timeline: quem alterou o quê e quando) + nota "edições de mês passado exigem admin e ficam em log".
- **Barra de ação fixa** no rodapé: papel ativo ("Editando como GP Kauany · 2 de 4 projetos editáveis · sobrealocação não bloqueia") + Cancelar / Salvar correções.

### 6.3 Referências visuais
Drawer: `screenshots/02-shot.png` (bloco "2a"). Tela dedicada: `screenshots/03-shot.png` (bloco "2b").

---

## 7. Edição de horas planejadas — estados do campo (por permissão)

O campo "Planejado" muda de aparência conforme a regra:

| Estado | Aparência | Quando |
|---|---|---|
| **Editável (foco)** | borda `1.5px #0C7E54` + anel `0 0 0 3px rgba(12,126,84,.10)`, fundo branco, ícone `pencil` | admin, ou GP `manager_id` daquele projeto, mês corrente/futuro |
| **Editável (repouso)** | borda `1px #DEE0D0`, fundo branco, ícone `pencil` muted | idem, sem foco |
| **Read-only (outro GP)** | borda `1px dashed #DEE0D0`, fundo `#F6F7EB`, valor muted `#8A8C7E`, ícone `lock`, legenda "Gerido por {nome}" (tooltip) | projeto de outro GP |
| **Read-only (internas)** | sem input, valor `—` | atividades internas (sem plan nesta fase) |

- **Lançado** e **Δ** são sempre read-only. Δ colorido: negativo em `#C2410C`.
- **Sobrealocação nunca bloqueia** o salvar; ao salvar, resumo e célula da tabela atualizam sem reload (invalidar `['project-team',…]`, `['allocation-overview',…]`, `['employee-availability',…]`).
- **Escrita reutiliza `useTeamMutations.updateMonthHours`** da aba Equipe — não criar mutation paralela.
- **Mês passado:** só admin, com registro em `project_member_month_logs`. GP recebe negação.

Para demonstração no protótipo há um **switcher de persona** (Admin / GP Kauany); no produto o papel vem do usuário autenticado + `manager_id` de cada projeto.

---

## 8. Fórmulas (fonte da verdade — ver spec funcional)
- **Capacidade** = `jornada_mensal` × dias úteis. **Planejado** = Σ `project_member_months.hours` ativas. **Realizado** = Σ `timesheet_entries` (projetos + internas).
- **% carga** = `planejado / capacidade × 100`. **Livres (futuro)** = `capacidade − planejado`.
- **Plan pró-rata** = `planejado × dias_úteis_decorridos / dias_úteis_do_mês` (seg–sex via date-fns ptBR, inclui o dia corrente; feriados são fast-follow).
- **Desvio de ritmo** = `realizado − plan_pró_rata`. Tolerância de 4h.

## 9. Regras invioláveis
- **Zero dados financeiros** em qualquer célula, tooltip, drawer, tela ou payload (auditar `salario_mensal`, `custo_hora`, `total_monthly_cost_estimated` etc.).
- `getUtilizationStatus()` (`src/lib/utilization.ts`) é a **única fonte de faixas/cores**; a aba Equipe passa a consumi-la (remover thresholds duplicados). *As cores plan×realizado da célula da aba Equipe são outro conceito e permanecem separadas.*
- Textos de UI em pt-BR; identificadores em inglês. Strict mode permanece desativado.
- Funcionário desligado some da tabela a partir do mês seguinte à `termination_date`.

## 10. Arquivos deste pacote
- `prototipo/Alocacao - Variacoes.dc.html` — protótipo hifi (abrir no navegador). Blocos: 1a/1b/1c (tabela), 2a/2b (detalhe). **Implementar 1b + 2a + 2b.**
- `prototipo/support.js` — runtime do protótipo (necessário para abrir o HTML; não é código de produção).
- `screenshots/01-shot.png` (tabela 1b), `02-shot.png` (drawer 2a), `03-shot.png` (tela 2b).
- `PROMPT_CLAUDE_CODE.md` — prompt pronto para colar no Claude Code.
