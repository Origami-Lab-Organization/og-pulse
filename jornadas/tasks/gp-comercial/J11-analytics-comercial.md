# GP-J11 — Analytics Comercial

> Jornada: GP Comercial J11 · Estado auditado: 🟡 PARCIAL (~50%)
> Dependências externas: nenhuma de migration nova obrigatória para o núcleo. **Interna:** o gráfico de concorrentes depende de `competitor_name` entregue por **GP-J7** (campo de concorrente no arquivamento); win rate por linha/serviço/modelo depende de `service_line_id`/modelo de receita estarem populados (GP-J2/J4).

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- `CommercialDashboard.tsx` + `useCommercialDashboard.ts`:
  - KPIs de conversão, ticket médio, ciclo de vendas, pipeline e forecast.
  - Funil visual; receita acumulada; donut por estágio; top clientes.
  - Motivos de perda (`LossReasonsChart`) — **sem** quebra por concorrente.
  - Export PDF.
  - `avgSalesCycleDays` **global** (não por etapa).
  - Filtros existentes: período, linha de serviço e responsável (admin).

**❌ Pendente:**
- Tempo médio **por etapa** do pipeline.
- Win rate por **linha de serviço**.
- Win rate por **modelo de receita**.
- **Top GPs** por conversão (admin only).
- KPI "Oportunidades que precisam de atenção" **clicável** (follow-up vencido + paradas além do threshold).
- Filtros novos: Serviço, Modelo de Receita, Etapa atual.
- Concorrentes mais citados nos motivos de perda (depende de GP-J7).

## História de Usuário

**Como** GP Comercial,
**quero** ver onde o pipeline trava, quais serviços/modelos convertem melhor e quais oportunidades precisam de atenção agora,
**para que** eu responda as 3 perguntas-chave em menos de 2 minutos, com dados em vez de intuição.

## Contexto

Jornada J11 F1/F2/F3. O dashboard já tem a base (KPIs, funil, donut, top clientes, motivos de perda, export PDF). Faltam as métricas granulares e o KPI acionável. Respeitar os bloqueios de dependência: o gráfico de concorrentes só é viável após GP-J7 popular `competitor_name`; as quebras por serviço/modelo dependem desses campos existirem e estarem preenchidos.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-A1 — Tempo médio por etapa**
- Para cada etapa do pipeline, calcular a média de dias que as oportunidades permaneceram antes de avançar ou ser arquivadas.
- Substitui/complementa o `avgSalesCycleDays` global, sem removê-lo.
- Estado "dados insuficientes" quando a amostra da etapa é pequena (pipeline recém-criado).

**CA-A2 — Win rate por linha de serviço e por modelo de receita**
- Win rate = fechadas ÷ (fechadas + arquivadas) por agrupamento.
- Dois recortes: por linha de serviço e por modelo de receita.
- Agrupamentos sem dados aparecem como "sem dados", não como 0% enganoso.

**CA-A3 — KPI "Oportunidades que precisam de atenção" (clicável)**
- Card com contagem de oportunidades que têm: follow-up vencido (`scheduled_at < now()` e `status != 'done'`) **ou** paradas além do threshold de dias da etapa atual.
- Clicar no card → lista filtrada dessas oportunidades.
- Reutiliza a regra de "vencido" do follow-up (alinhar com GP-J5) — não duplicar definição.

**CA-A4 — Top GPs por conversão (admin only)**
- Ranking de GPs por conversão; visível apenas para admin (mesma gate de visibilidade do filtro "responsável" já existente).

### Parte B — Melhorias no existente (depois)

**CA-B1 — Novos filtros**
- Adicionar aos filtros atuais: Serviço (dentro da linha de serviço), Modelo de Receita, Etapa atual.
- Todos os gráficos e KPIs respeitam os filtros aplicados, combinando com período/linha/responsável já existentes.

**CA-B2 — Concorrentes nos motivos de perda** *(depende de GP-J7)*
- No `LossReasonsChart` (ou painel adjacente), exibir os concorrentes mais citados quando o motivo = "Concorrência", usando `competitor_name`.
- Enquanto GP-J7 não estiver entregue / sem dados: exibir estado vazio orientativo, sem quebrar o gráfico de motivos.

**CA-B3 — Export PDF cobre as novas seções**
- O export PDF já existente passa a incluir as novas visualizações e o KPI de atenção.

## Fora do Escopo

- Adicionar o campo `competitor_name` em si → **GP-J7** (esta task apenas consome).
- Normalização de nomes de concorrentes duplicados ("Totvs"/"TOTVS"/"totvs") — cenário-limite, avaliar depois (hoje contam como entradas separadas).
- Renomeação CRM→Comercial (GP-J2).
- Novas métricas de projeto/portfólio (fora do escopo comercial).

## Notas Técnicas

- Componente: `src/components/.../CommercialDashboard.tsx`; hook: `src/hooks/useCommercialDashboard.ts`.
- Tempo por etapa: derivar de histórico de transições de etapa (ex: `lead_activity_log`, migration 20260314120000) — preferir cálculo no banco/agregação a varrer tudo no cliente.
- KPI de atenção: regra de "vencido" vem de `lead_follow_ups` (`scheduled_at`/`status`); thresholds de parado por etapa devem espelhar os definidos em GP-J3 (Qualificação 14d, Proposta 7d, Negociação 3d) — centralizar a constante, não duplicar.
- Win rate por serviço/modelo depende de `service_line_id`/modelo estarem preenchidos (GP-J2/J4); tratar nulos como "sem dados".
- Multi-tenant/RLS: todas as agregações filtram por `tenant_id`; "Top GPs" e filtro de responsável só para admin (manter a gate de visibilidade já existente).
- "Dados insuficientes" como estado de primeira classe nos gráficos novos (jornada exige estado orientativo com pipeline recém-criado).

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Pipeline com histórico de transições | Tempo médio por etapa calculado e exibido por coluna |
| Pipeline recém-criado / amostra pequena | "Dados insuficientes" em vez de número enganoso |
| Win rate por linha de serviço | % correto = fechadas ÷ (fechadas + arquivadas) por linha |
| Linha/modelo sem oportunidades | "Sem dados", não 0% |
| KPI de atenção | Contagem = follow-ups vencidos + parados além do threshold da etapa |
| Clicar no KPI de atenção | Lista filtrada das oportunidades correspondentes |
| Top GPs como não-admin | Seção oculta |
| Filtro por Modelo de Receita | Todos os gráficos/KPIs refletem o filtro combinado |
| Motivos de perda com GP-J7 entregue | Concorrentes mais citados aparecem |
| Motivos de perda sem `competitor_name` | Estado vazio orientativo; gráfico de motivos intacto |
| Export PDF | Inclui novas visualizações + KPI de atenção |
| Agregação cross-tenant | Bloqueada por RLS; só dados do tenant atual |
