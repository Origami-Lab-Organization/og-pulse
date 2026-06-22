# FUNC-J5 — Meus Projetos
> Jornada: Funcionário J5 · Estado auditado: ✅ IMPLEMENTADO (~85%)
> Dependências externas: nenhuma bloqueante. Lê dados de projetos/membership já existentes (`useMyProjects`).

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Página dedicada `src/pages/MyProjects.tsx` com grid de cards via hook `useMyProjects()`
- Cada card mostra badge de fase, cliente, GP responsável, papel do consultor e contagem de atividades atribuídas
- Nenhum dado financeiro exposto: só horas (`myHoursPerMonth`, planejado/realizado) — sem margem/receita/custo
- Estado vazio orientativo (`MyProjects.tsx:206-255`)
- RLS: `useMyProjectDetail()` valida membership antes de retornar dados

**❌ Pendente:**
- Tratamento especial para projeto em fase **"planning"** (badge "Em Preparação" + mensagem ao clicar)
- "Próximo marco" não é renderizado no card (dado pode existir, mas não aparece)
- Widget compacto no dashboard de Meu Espaço com os 3 projetos mais recentes + link "Ver todos →"

## História de Usuário

**Como** Consultor alocado em projetos,
**quero** uma visão consolidada dos meus projetos ativos com fase e próximo marco, acessível direto do Meu Espaço,
**para que** eu tenha o panorama em 30 segundos sem navegar pela área do GP.

## Contexto

A jornada J5 está quase pronta: o grid, o filtro operacional (sem financeiro), o estado vazio e o RLS já funcionam. Faltam três acabamentos de baixo esforço e alto valor de orientação: distinguir o projeto em planejamento (o consultor ainda não deve "entrar" nele), mostrar o próximo marco no card e dar um atalho no dashboard. Tudo lê dados já disponíveis — sem dependência externa bloqueante.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Projeto em planejamento**
- Card de projeto em fase `planning` exibe badge "Em Preparação"
- Ao clicar: mensagem "Este projeto ainda está em fase de planejamento. O GP irá notificá-lo quando iniciar." (não abre a view de execução)
- Filtro padrão do grid continua mostrando apenas projetos ativos (`execution`, `results_presentation`, `case_and_learnings`); o card em preparação aparece sinalizado, sem acesso ao detalhe operacional

**CA-02 — Próximo marco no card**
- Card renderiza o próximo marco relevante quando houver (nome + data); quando não houver, omite a linha sem quebrar o layout
- Reusar a fonte de marcos já carregada por `useMyProjects()`/detalhe; não criar nova consulta pesada

**CA-03 — Widget no dashboard de Meu Espaço**
- Widget compacto exibindo os 3 projetos mais recentes do consultor (fase + cliente)
- Link "Ver todos →" navega para `/meus-projetos`
- Reusa `useMyProjects()`; respeita o mesmo filtro de fases ativas
- Estado vazio do widget consistente com o da página

### Parte B — Melhorias no existente (depois)

**CA-04 — Responsividade do grid**
- Grid permanece legível e sem quebra de layout com 10+ projetos em mobile (validar contra J12 PWA)

**CA-05 — Reforço de RLS por URL direta**
- Confirmar que `/projetos/:id` (ou rota equivalente) de projeto onde o consultor **não** é membro é bloqueado por RLS e tratado com mensagem amigável (não tela de erro técnica)

## Fora do Escopo
- Layout mobile dedicado/PWA do grid (J12 — task separada)
- Qualquer dado financeiro (margem/receita/custo permanecem ausentes por design)
- Notificação `project_started` quando o projeto sai de planejamento (parte de J3 Inbox — task separada)

## Notas Técnicas
- Página: `src/pages/MyProjects.tsx`; hook: `useMyProjects()`; detalhe: `useMyProjectDetail()`
- Widget do dashboard: adicionar ao dashboard de Meu Espaço reaproveitando `useMyProjects()` (sem novo endpoint)
- Fases de referência: `planning`, `execution`, `results_presentation`, `case_and_learnings`
- Respeitar `tenant_id` e RLS — não relaxar a validação de membership existente

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Projeto em fase `planning` | Badge "Em Preparação"; clique mostra mensagem, não abre execução |
| Projeto ativo com marco futuro | Card renderiza nome + data do próximo marco |
| Projeto ativo sem marco | Linha de marco omitida; layout intacto |
| Dashboard de Meu Espaço | Widget mostra 3 projetos recentes + "Ver todos →" funcional |
| Consultor sem projetos | Estado vazio na página e no widget |
| Acesso a `/projetos/:id` sem membership | RLS bloqueia; mensagem amigável |
| 10+ projetos em mobile | Grid responsivo sem quebrar |
