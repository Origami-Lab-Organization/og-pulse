# Hackathon Origami Pulse
## Jornadas da Persona — GP Projetos
### Guia Completo para as Equipes

---

**Data:** 04 de junho de 2026 · Origami Lab · Formiga MG  
**Persona:** Cecilia (Titila) — Gerente de Projetos  
**Equipe responsável:** 🐟 Koi (GP Comercial + GP Projetos, 3 pessoas)  
**Total de jornadas:** 17

---

## Quem é o GP de Projetos

O Gerente de Projetos assume a responsabilidade pela entrega após o negócio ser fechado no Comercial. Ele gerencia tudo: planejamento, equipe, orçamento, entregas e relacionamento com o cliente. Em consultorias de pequeno porte, é comum o mesmo GP fechar e executar o projeto.

**Persona:** Cecilia (Titila), GP da Origami Lab. Vive a tensão permanente de entregar qualidade dentro do prazo, da margem prometida e da expectativa do cliente — ao mesmo tempo que gerencia múltiplos projetos e equipes.

**O que tira o GP do sono:**
- Descobrir que a margem de um projeto foi embora sem avisar
- Alocar alguém que já está 100% ocupado em outro projeto
- Cliente perguntando algo que o sistema não responde
- Scope creep sem registro formal → trabalho extra sem receita

---

## Como Usar Este Documento

Para cada jornada você encontrará:
- **Impacto Origami/Persona:** score de 1 a 5 indicando prioridade de negócio e valor para a persona
- **Contexto:** o problema que estamos resolvendo
- **Objetivo:** o que o GP consegue fazer quando a jornada estiver implementada
- **Estado Atual:** o que já existe no código hoje e o que está faltando
- **Jobs to be Done:** por que o GP realmente precisa desta funcionalidade
- **Fluxos:** como a jornada funciona na prática, passo a passo
- **Cenários-Limite:** situações que a equipe deve testar antes de considerar pronto
- **Critério de Sucesso:** como saber que a jornada foi concluída com qualidade

**Regra de ouro:** antes de construir qualquer coisa, percorra o fluxo existente como o GP e documente as fricções. Nenhuma história é marcada como concluída sem ser testada pela persona.

---

## Estrutura do Projeto após J1

| # | Aba | Value interno | Estado |
|---|---|---|---|
| 1 | Visão Geral | `overview` | Redesenhar |
| 2 | Objetivos | `objectives` | Renomear de OKR |
| 3 | Roadmap | `roadmap` | Redesenhar de Cronograma |
| 4 | Atividades | `activities` | **Novo** |
| 5 | Métricas | `metrics` | **Novo** |
| 6 | Equipe | `team` | **Novo** |
| 7 | Custos | `costs` | Melhorar UX |
| 8 | Stakeholders | `stakeholders` | + NPS |
| 9 | Financeiro | `financial` | Melhorar + migrar Comissões |
| 10 | Arquivos | `files` | **Novo** |

**⚠️ Aba Comissão → remover permanentemente. Dados migram para aba Financeiro.**

---

## Ciclo de Vida do Projeto

| Stage | Label | Transição |
|---|---|---|
| `planning` | Planejamento | GP → Execução quando checklist completo |
| `execution` | Em Execução | GP |
| `results_presentation` | Apresentação de Resultados | GP |
| `case_and_learnings` | Case e Aprendizados | GP |
| `completed` | Concluído | GP + Admin (irreversível) |

**Migration obrigatória no Sprint 1:** `value_delivery → execution`, `value_book → remover`, `learning_case → case_and_learnings`

---

## Matriz de Permissões

| Aba | Consultor | GP do Projeto | Admin |
|---|---|---|---|
| Visão Geral | ✓ (sem financeiro) | ✓ completo | ✓ |
| Objetivos | ✓ leitura | ✓ editar | ✓ |
| Roadmap | ✓ leitura | ✓ editar | ✓ |
| Atividades | ✓ próprias | ✓ tudo | ✓ |
| Métricas | ✓ leitura | ✓ | ✓ |
| Equipe | ✓ sem custos | ✓ sem custos | ✓ |
| Custos | ✗ | ✓ | ✓ |
| Stakeholders | ✓ nome/contato/NPS | ✓ | ✓ |
| Financeiro | ✗ | ✓ | ✓ |
| Arquivos | ✓ upload | ✓ | ✓ |

---

---

# JORNADA J1
## Estrutura e Ciclo de Vida do Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**⚠️ CRÍTICO — Executar junto com migration de stages no Sprint 1. Desbloqueia todas as outras jornadas.**

---

### Contexto e Problema

O `ProjectDetail.tsx` existe com 7 abas desalinhadas com o modelo atual. A aba Comissão não faz mais sentido. Os stages do `portfolio_stage` usam nomes antigos (`value_delivery`, `value_book`, `learning_case`). O sistema de permissões é binário (`isReadOnly: boolean`) — insuficiente para a granularidade necessária entre GP, consultor e admin.

### Objetivo

Estrutura de 10 abas correta, ciclo de vida com 5 etapas funcionando com indicador visual no header, permissões granulares por aba aplicadas. **J1 é o alicerce estrutural — nada mais funciona corretamente sem ela.**

### Estado Atual

`ProjectDetail.tsx` com 7 abas existe. `isReadOnly` controla permissões de forma binária. Stages antigos estão no banco e precisam de migration. Aba Comissão ainda aparece.

---

### Jobs to be Done

**Funcionais:**
- Ter as abas certas para gerenciar cada dimensão do projeto sem confusão
- Avançar o projeto entre fases com critérios claros de transição
- Saber em qual fase o projeto está sem precisar perguntar ao admin

**Emocionais:**
- Sentir que o sistema foi construído para a minha forma de trabalhar
- Não sentir que estou quebrando o sistema ao mudar a fase de um projeto

**Social:**
- Mostrar para o cliente em qual fase está a entrega quando ele perguntar

---

### Fluxos

**F1 — Remover aba Comissão**  
Remover `TabsTrigger value="commissions"` e o componente `ProjectCommissionsTab`. Zero referências a "Comissão" devem permanecer na interface.

**F2 — Renomear abas**  
OKR → Objetivos, Cronograma → Roadmap nos `TabsTrigger`. Manter nomes técnicos internos (value, path) inalterados para não quebrar rotas.

**F3 — Adicionar abas placeholder**  
Criar `TabsTrigger` + `TabsContent` com empty state orientativo para: Atividades, Métricas, Equipe e Arquivos. Placeholders funcionam como receptores enquanto as jornadas correspondentes são implementadas.

**F4 — Migration de Stages**  
```sql
UPDATE projects SET portfolio_stage = 'execution' WHERE portfolio_stage = 'value_delivery';
UPDATE projects SET portfolio_stage = 'case_and_learnings' WHERE portfolio_stage = 'learning_case';
-- value_book: migrar para completed ou manter como execution dependendo do contexto
```
Executar junto com Admin J4 no Sprint 1. Coordenar com equipe Tsuru.

**F5 — Indicador de ciclo de vida no header**  
Componente de progresso visual com 5 etapas no `ProjectHeader`. Visível em todas as abas. GP vê em qual fase está e qual vem a seguir. Transição para Concluído é irreversível — confirmar com dialog explícito.

**F6 — Expandir permissões**  
Substituir `isReadOnly: boolean` por objeto `permissions` com granularidade por aba e por ação (ler, editar, criar, deletar). Aplicar a matriz de permissões da tabela acima.

---

### Cenários-Limite

- Consultor acessa projeto via URL direta — abas Custos e Financeiro desaparecem completamente (não apenas desabilitadas)?
- GP de outro projeto acessa dados de custo via URL — RLS no banco bloqueia?
- Admin marca projeto como Concluído com parcelas em aberto — sistema alerta?
- Migration em projeto ativo não causa perda de dados?

---

### Critério de Sucesso

10 abas visíveis e navegáveis. 5 stages com indicador visual no header. Consultor não vê dados financeiros em nenhum cenário. Zero ocorrências de "Comissão" no sistema. Migration executada com sucesso confirmada no banco.

---

---

# JORNADA J2
## Planejamento do Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

O planejamento existe com checklist passivo. O GP aloca equipe sem nenhuma visibilidade de quantas horas cada funcionário tem disponíveis em outros projetos. O resultado: conflitos de alocação descobertos depois que o projeto já começou.

### Objetivo

GP completa todo o planejamento sem sair das abas do projeto: objetivos, equipe com disponibilidade real, roadmap, custos e NFs — antes de mover para Execução.

### Estado Atual

`ProjectPlanningOverviewTab` existe com checklist de 6 itens passivo. `useMyAllocationData` calcula capacidade mensal. `ProjectLaborSection` tem lógica de planejamento. **Falta: visibilidade de disponibilidade ao alocar + checklist ativo com ações diretas.**

---

### Jobs to be Done

**Funcionais:**
- Completar todo o planejamento sem sair do sistema ou usar planilha
- Saber se a equipe tem horas disponíveis antes de comprometer com o cliente
- Ter checklist claro do que precisa estar definido antes de iniciar a execução

**Emocionais:**
- Começar a execução com segurança de que planejei tudo que precisava
- Não descobrir conflitos de alocação depois que o projeto já começou

**Social:**
- Demonstrar para o cliente que o projeto foi planejado com rigor antes de começar

---

### Fluxos

**F1 — Checklist Ativo**  
Reformular `ProjectPlanningOverviewTab` de lista passiva para painel ativo. Cada item tem botão de ação direta para a aba correspondente. Progresso exibido como "X/5 itens completos".

**Itens obrigatórios para avançar para Execução:**
1. Cliente + GP definidos
2. Mínimo 1 Objetivo com 1 KR (aba Objetivos)
3. Mínimo 1 membro com horas > 0 (aba Equipe)
4. Mínimo 1 marco no Roadmap
5. Mínimo 1 parcela com data de emissão (aba Financeiro)

**F2 — Disponibilidade Real da Equipe**  
Novo hook: `useEmployeeAvailability(employeeId, startDate, endDate)`

Ao adicionar membro durante planejamento, exibir tabela mês a mês:

| Mês | Capacidade | Já alocado | Disponível | Planejando alocar | Status |
|---|---|---|---|---|---|

Cálculo: `Disponível = (jornada_diaria × dias_úteis_do_mês) − horas_já_alocadas_em_outros_projetos`

Aviso visual (não bloqueio) quando GP aloca mais que o disponível. O GP precisa da informação para negociar ou ajustar — nunca bloquear.

**F3 — Calendário de Dias Úteis Visível**  
Ao planejar horas mensais, exibir: "Outubro de 2026 tem 23 dias úteis. Considerando jornada de 8h/dia, capacidade máxima é de 184h." Inclui feriados nacionais cadastrados no sistema.

**F4 — Conferência de NFs**  
Na aba Financeiro durante planejamento, GP edita datas de emissão e vencimento diretamente na tabela — sem abrir dialog por linha.

**F5 — Transição para Execução**  
Botão "Iniciar Execução" habilitado apenas com checklist 5/5. Dialog de confirmação: "O timesheet será habilitado para a equipe. Eles serão notificados. Confirmar?"

---

### Cenários-Limite

- Funcionário com `jornada_diaria: 0` — capacidade calculada como zero sem divisão por zero?
- Funcionário em férias no mês — horas de férias reduzem disponibilidade?
- Projeto contínuo sem data de fim — disponibilidade exibe mínimo 12 meses?
- GP aloca 200% da capacidade — aviso claro mas não bloqueia?

---

### Critério de Sucesso

GP completa planejamento de projeto de 6 meses com 3 membros vendo disponibilidade mês a mês antes de alocar. Checklist 0/5 → 5/5. Transição para Execução com dialog de confirmação. Equipe documenta 3 melhorias de UX no fluxo atual.

---

---

# JORNADA J3
## Visão Geral do Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

A `ProjectOverviewTab` existe mas mistura dados financeiros com operacionais sem distinção de roles. Não há narrativa de saúde do projeto. A fase não influencia o que é exibido. Consultor vê a mesma tela que o GP — incluindo dados que não deveria ver.

### Objetivo

GP abre Visão Geral e em 30 segundos sabe se o projeto está saudável e qual é o próximo passo. Consultor tem contexto operacional sem nenhum dado financeiro.

---

### Jobs to be Done

**Funcionais:**
- Saber em 30 segundos se o projeto está saudável ou precisa de atenção
- Ver progresso operacional e financeiro em um único lugar
- Identificar o próximo passo mais importante sem navegar por múltiplas abas

**Emocionais:**
- Sentir controle sobre o projeto mesmo nos dias em que não trabalhei nele
- Não ser surpreendido pelo cliente perguntando sobre algo que eu deveria saber

**Social:**
- Ter uma visão clara para apresentar ao admin ou ao cliente em qualquer momento

---

### Fluxos

**F1 — View do GP (5 blocos)**

- **Bloco 1 — Header:** nome, cliente, fase com progresso visual, GP, datas, Linha/Serviço, badge de saúde
- **Bloco 2 — KPIs financeiros:** receita planejada vs. realizada, custo planejado vs. realizado, margem bruta %, próxima NF
- **Bloco 3 — Progresso operacional:** horas realizadas/planejadas %, OKRs concluídos (X/Y), próximo marco
- **Bloco 4 — Equipe compacta:** avatar, nome, cargo, horas do mês (sem custo)
- **Bloco 5 — Atividade recente:** últimas 5 ações (sem eventos financeiros para o consultor)

**F2 — View do Consultor**  
Idêntica ao GP mas sem Bloco 2 (KPIs financeiros) e sem eventos financeiros no Bloco 5. Implementar via objeto `permissions` de J1.

**F3 — Badge de Saúde do Projeto**  
Hook `useProjectHealthIndicators` compartilhado com J11 e J13.

| Sinal | Crítico 🔴 | Atenção 🟡 |
|---|---|---|
| Margem | Abaixo do mínimo do admin | Entre mínimo e mínimo + 5pp |
| Horas | Realizado > 110% do planejado | Realizado 95–110% |
| Prazo | Data fim passou sem conclusão | Últimos 15% do prazo |
| NF vencida | Parcela em atraso | Vence em 3 dias |

Badge clicável → popover com detalhamento por sinal.

**F4 — Retrospectiva Interna (fase Case e Aprendizados)**  
Bloco adicional editável pelo GP com 4 campos: o que funcionou / o que não funcionou / o que faríamos diferente / lições para próximos projetos. Novos campos na tabela `projects`.

**F5 — Fase Concluído**  
Retrospectiva exibida em somente leitura.

---

### Cenários-Limite

- Badge Crítico clicável — popover mostra exatamente qual valor vs. mínimo do admin?
- Projeto sem NF configurada — área de "Próxima NF" exibe estado vazio orientativo?
- Projeto contínuo sem data fim — bloco de prazo exibe "Contínuo"?
- Consultor acessa via URL direta — zero dados financeiros chegam ao frontend?

---

### Critério de Sucesso

GP lê saúde do projeto em 30 segundos. Consultor não vê dado financeiro em nenhuma circunstância. Badge de saúde calcula corretamente margem, horas e prazo. Retrospectiva editável em C&A e somente leitura em Concluído.

---

---

# JORNADA J4
## Objetivos do Projeto (OKR)

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

`ProjectOKRsTab` existe com CRUD completo, nível de confiança em 5 níveis e histórico de KRs. Problemas: aba ainda chama "OKR", atualização de `current_value` é feita dentro do dialog completo sem contexto de quando foi a última atualização, e o consultor vê a mesma interface que o GP.

### Objetivo

GP acompanha OKRs com check-ins rápidos e contextualizados. Consultor visualiza progresso sem editar. Zero ocorrências de "OKR" na interface.

---

### Jobs to be Done

**Funcionais:**
- Definir objetivos mensuráveis para o projeto e acompanhar a evolução
- Atualizar progresso de um key result em menos de 30 segundos
- Saber rapidamente se os objetivos do projeto estão no caminho certo

**Emocionais:**
- Sentir que o trabalho da equipe está conectado aos resultados esperados pelo cliente
- Não ter sensação de trabalhar sem saber se está indo na direção certa

**Social:**
- Mostrar para o cliente evidências concretas de progresso em reuniões de acompanhamento

---

### Fluxos

**F1 — Renomear em toda a interface**  
"OKR" → "Objetivo/Objetivos" em todos os labels visíveis. Internamente manter nomes técnicos. Testar: buscar por "OKR" no código e verificar se alguma ocorrência visível ao usuário permanece.

**F2 — Check-in Inline por KR**  
Botão "Atualizar" ao lado de cada KR (não dentro do dialog completo). Abre popover compacto com:
- Novo `current_value` (valor anterior exibido como referência)
- Seletor de nível de confiança (1–10 ou semáforo)
- Nota opcional
- Ao salvar: registra em `KeyResultHistory` com timestamp e quem atualizou

**F3 — Status do OKR Inline**  
GP muda `pending → in_progress → completed` diretamente no card sem abrir dialog. Ao marcar `completed`, sistema sugere marcar todos os KRs como meta atingida.

**F4 — View Consultor**  
Lista de OKRs com progresso, KRs com barra e nível de confiança, botão de histórico. Sem botões de criação, edição ou exclusão.

**F5 — Cards de Métricas**  
Objetivos completos (X/Y), progresso médio %, KRs no prazo, nível de confiança geral.

---

### Cenários-Limite

- `current_value` > `target_value` — superação de meta é permitida?
- OKR com 3 KRs em 100/0/0% — progresso médio exibe 33% corretamente?
- OKR `cancelled` — não entra no cálculo de progresso médio?

---

### Critério de Sucesso

GP cria objetivo com 3 KRs, realiza check-in com nota, histórico exibe atualização com timestamp. Consultor vê sem botão de edição. Zero ocorrências de "OKR" visíveis ao usuário.

---

---

# JORNADA J5
## Roadmap e Marcos

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

`ProjectScheduleTab` existe com CRUD de milestones e timeline horizontal. Todos os itens são do mesmo tipo sem distinção marco/release/épico. Visualização horizontal é rudimentar para projetos de 6+ meses. Label "Cronograma" não comunica roadmap orientado a entregas.

### Objetivo

GP cadastra marcos, releases e épicos em visualização temporal clara. Consultor visualiza o roadmap como contexto de trabalho sem editar.

---

### Jobs to be Done

**Funcionais:**
- Cadastrar e visualizar os principais marcos em timeline clara
- Saber imediatamente quais marcos estão atrasados sem verificar um por um
- Comunicar o cronograma de entregas para a equipe e o cliente de forma visual

**Emocionais:**
- Sentir que as entregas estão organizadas e que existe um plano claro
- Não sentir ansiedade ao ser perguntado sobre o cronograma do projeto

**Social:**
- Apresentar uma visão clara do roadmap ao cliente em reuniões de status

---

### Fluxos

**F1 — Renomeação**  
Cronograma → Roadmap em todos os labels visíveis.

**F2 — Tipos de Item (`milestone_type`)**

| Tipo | Descrição | Datas |
|---|---|---|
| `milestone` | Marco pontual | Apenas `target_date` |
| `release` | Entrega ao cliente | `start_date` + `end_date` |
| `epic` | Conjunto de trabalho interno | `start_date` + `end_date` |
| `internal` | Entrega interna | `start_date` + `end_date` |

`MilestoneFormDialog` adapta campos exibidos conforme tipo selecionado.

**F3 — Vínculo com OKR (`okr_id`)**  
Campo opcional vinculando item do roadmap a um objetivo do projeto para rastreabilidade.

**F4 — Timeline Reformulada**  
Colunas = meses, linhas = itens. Épicos/Releases como barras coloridas. Marcos como diamantes ◇. Mês atual com linha vertical destacada. Status comunicado pela cor do item.

**F5 — Status Delayed Automático**  
Ao abrir a página, itens com `target_date` ou `end_date` passada e status ≠ `completed` são marcados como `delayed` automaticamente. Sem necessidade de ação manual.

**F6 — Integração com Atividades (J6)**  
Cada item do roadmap exibe contagem de cards de J6 vinculados. Clicável → filtra o Kanban para mostrar apenas os cards daquele marco.

**F7 — Cards de Métricas**  
Marcos concluídos (X/Y), próxima entrega, itens atrasados, % concluído.

---

### Cenários-Limite

- Marco tipo `milestone` sem data fim — timeline renderiza sem barra?
- Épico com datas além do fim do projeto — alerta ou bloqueio?
- 12+ itens no mesmo mês — layout legível sem scroll excessivo?

---

### Critério de Sucesso

GP cria roadmap com os 4 tipos diferentes. Timeline comunica progresso visualmente com mês atual destacado. Itens atrasados marcados automaticamente. Consultor visualiza sem botão de edição. Equipe documenta 3 fricções da visualização atual.

---

---

# JORNADA J6
## Atividades — Kanban do Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**📋 Consultar stories PUL-75 a PUL-89 (epic PUL-74) no Jira antes de implementar.**

---

### Contexto e Problema

Aba Atividades não existe. GP e consultores gerenciam trabalho em ferramentas externas (Trello, Notion, post-its). Resultado: nenhuma rastreabilidade dentro do sistema, histórico perdido quando alguém sai da empresa.

### Objetivo

GP e consultores gerenciam o trabalho do projeto em Kanban compartilhado dentro do Pulse. Cards vinculados ao roadmap. Histórico auditável completo em cada card.

---

### Jobs to be Done

**Funcionais:**
- Criar e gerenciar tarefas do projeto em board visual dentro do sistema
- Saber o que cada membro da equipe está fazendo agora sem precisar perguntar
- Rastrear progresso de cada atividade até a entrega final

**Emocionais:**
- Sentir que o trabalho do projeto está organizado e visível para todos
- Não depender de ferramentas externas para gerenciar o trabalho do dia a dia

**Social:**
- Demonstrar para o cliente que o trabalho está sendo gerenciado com método

---

### Fluxos

**F1 — Estrutura do Board**  
5 colunas configuráveis (padrão): `backlog`, `todo`, `in_progress`, `review`, `done`. Colunas criadas automaticamente na criação do projeto. GP pode renomear.

**F2 — Card de Atividade**

| Campo | Obrig | Descrição |
|---|---|---|
| Título | ✓ | |
| Tipo | ✓ | `tarefa`, `issue`, `entrega`, `melhoria` |
| Responsável | — | Membro da equipe |
| Prioridade | — | `baixa`, `normal`, `alta`, `crítica` |
| Data de entrega | — | |
| **Marco vinculado** | — | Rastreabilidade com Roadmap (J5) |
| OKR vinculado | — | |
| Descrição | — | |
| Labels | — | Tags livres |

**F3 — Criação Rápida**  
Clicar "+ Adicionar card" → digitar título → Enter. Criação completa via dialog com todos os campos.

**F4 — Drag-and-Drop**  
@dnd-kit (já no projeto). Qualquer membro move cards. Exceção: para `done` apenas o responsável ou o GP.

**F5 — Painel Lateral do Card**  
Clicar no card → painel lateral (não dialog central). Campos editáveis inline. Comentários com upload de anexos. Seção "Histórico" somente leitura.

**F6 — Histórico Auditável**

| Evento | Exemplo |
|---|---|
| Criação | "Victor criou este card — 02/06 às 14:30" |
| Mudança de coluna | "Cecilia moveu de Backlog para Em Andamento" |
| Mudança de responsável | "Victor atribuiu para Cecilia" |
| Mudança de prioridade | "Prioridade alterada de Normal para Crítica" |
| Vínculo com marco | "Vinculado ao marco Release v1.0" |

**F7 — Filtros**  
Busca, responsável, prioridade, tipo, toggle "Apenas meus cards".

**F8 — Cards de Métricas**  
Concluídos, em andamento, atrasados, sem marco vinculado.

**F9 — Mapeamento para Meu Kanban (J4 Funcionário)**  
GP configura quais colunas do projeto mapeiam para os status do kanban pessoal do consultor (A Fazer / Fazendo / Feito). Esse mapeamento é obrigatório no checklist de planejamento de J2.

---

### Schema Novo

Tabelas: `project_board_columns`, `project_cards`, `project_card_comments`, `project_card_labels`, `project_card_column_history` *(usado em J7)*, `project_card_field_history`

---

### Permissões

| Ação | Consultor | GP | Admin |
|---|---|---|---|
| Criar card | ✓ | ✓ | ✓ |
| Editar card próprio | ✓ | ✓ | ✓ |
| Editar card de outro | ✗ | ✓ | ✓ |
| Mover → done | Só próprio | ✓ | ✓ |
| Deletar card | ✗ | ✓ | ✓ |

---

### Cenários-Limite

- Consultor tenta mover card de outro para done — sistema bloqueia com mensagem clara?
- Card aberto no painel enquanto outro membro comenta — novo comentário aparece sem reload?
- 50+ cards na coluna Backlog — performance aceitável sem virtualização?

---

### Critério de Sucesso

GP cria 5 cards de tipos diferentes. Consultor move próprio card para Concluído. Histórico auditável visível com timestamps. Contagem de cards no item do roadmap atualiza quando card é vinculado. Equipe documenta 3 decisões de UX.

---

---

# JORNADA J7
## Métricas do Projeto

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5  
**⚠️ Depende de J6:** `project_card_column_history` necessário para cycle time e aging.

---

### Contexto e Problema

Aba não existe. GP não consegue ver o fluxo de trabalho de forma consolidada. Backlog cresce silenciosamente sem que ninguém perceba.

### Objetivo

GP abre aba Métricas e em 2 minutos entende: o trabalho flui bem? A equipe está sobrecarregada? O backlog está saudável?

---

### Jobs to be Done

**Funcionais:**
- Entender se o fluxo de trabalho da equipe está saudável ou com gargalos
- Identificar tasks paradas no backlog há tempo demais
- Tomar decisões sobre capacidade com base em dados reais

**Emocionais:**
- Sentir que consigo melhorar o processo da equipe com evidências, não intuição
- Não ter a sensação de que o trabalho anda mas não saber a velocidade real

**Social:**
- Apresentar métricas de performance da equipe em retrospectivas com o cliente

---

### Fluxos

**F1 — As 5 Métricas Principais**

| Métrica | Cálculo | Exibição |
|---|---|---|
| **Throughput** | Cards movidos para `done` nos últimos 7 dias | Número + tendência vs. 7 dias anteriores |
| **Cycle Time** | Mediana do tempo `in_progress → done` (30 dias) | "X,X dias" (P50/P85/P95) |
| **WIP** | Cards atualmente em `in_progress` + `review` | Número + alerta se > threshold |
| **Taxa no Prazo** | Cards concluídos com `completed_at ≤ due_date` (30 dias) | "X% no prazo" |
| **Aging do Backlog** | Tempo médio de cards parados no backlog sem movimentação | "X dias · Y cards críticos (>30d)" |

**F2 — Visualizações**  
- Gráfico de throughput por semana (8 semanas, Recharts)
- Histograma de cycle time com percentis P50/P85/P95
- Tabela de aging do backlog (mais antigo primeiro) com marco vinculado

**F3 — WIP Threshold**  
Configurável pelo GP (padrão: membros da equipe × 2). Alerta visual quando ultrapassado.

**F4 — Filtro de Período**  
7/14/30/90 dias ou personalizado. WIP e aging são sempre snapshots do momento atual.

**Permissões:** Consultor vê todas as métricas sem restrição.

---

### Cenários-Limite

- Sem nenhum card concluído — throughput "0", cycle time "—" sem quebrar o componente?
- Card concluído e devolvido ao backlog — cycle time usa primeira ou última conclusão?
- Projeto com menos de 7 dias — dados parciais com aviso "período insuficiente"?

---

### Critério de Sucesso

GP responde throughput, cycle time e 3 cards mais antigos em 2 minutos. Consultor vê as métricas. Equipe documenta a decisão técnica sobre histórico completo vs. aproximação com `created_at`.

---

---

# JORNADA J8
## Equipe

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5  
**⚠️ Compartilha hook `useEmployeeAvailability` com J2 e J15.**

---

### Contexto e Problema

Gestão de equipe está dentro do `ProjectCostsTab` — aba restrita ao GP. Consultor não sabe quantas horas está planejado para trabalhar. `ProjectLaborSection` mistura horas com custos na mesma interface.

### Objetivo

GP gerencia alocação sem expor custos financeiros. Consultor vê seu próprio planejamento mês a mês. Custos ficam exclusivamente na aba Custos.

---

### Jobs to be Done

**Funcionais:**
- Ver mês a mês quantas horas cada membro planejou vs. executou no projeto
- Replanejar a alocação quando alguém entra ou sai do projeto
- Comunicar a equipe sobre o planejamento sem expor dados de custo

**Emocionais:**
- Sentir que o planejamento de equipe está documentado e não na minha cabeça
- Não ter conversas difíceis sobre sobrecarga por falta de visibilidade antecipada

**Social:**
- Demonstrar para os membros da equipe que o planejamento foi feito com cuidado

---

### Fluxos

**F1 — Relação com aba Custos**  
O `ProjectLaborSection` **permanece intacto** na aba Custos. A nova aba Equipe é uma **view alternativa** dos mesmos dados (`project_member_months` + `project_timesheets`) sem expor custo/hora ou custo total.

**F2 — Cards de Métricas**

| Métrica | Visibilidade |
|---|---|
| Total horas planejadas | Todos |
| Total horas realizadas | Todos |
| % de execução | Todos |
| Membros acima do planejado | GP + Admin |
| Membros sem horas lançadas | GP + Admin |

**F3 — Tabela Mês a Mês**  
Cabeçalho: Membro | Mês 1 | ... | Mês N | Total

Cada célula: `Xh plan / Yh real` com cores:
- 🟢 Verde: realizado ≥ planejado
- 🟡 Amarelo: realizado 80–99%
- 🔴 Vermelho: realizado < 80% ou zero
- ⬜ Cinza: mês futuro (apenas planejado)

Consultor logado sempre na primeira linha.

**F4 — Replanejamento (GP/Admin)**  
- Adicionar membro com visão de disponibilidade (reutiliza `useEmployeeAvailability` de J2)
- Editar horas planejadas inline por célula de mês
- Remover membro sem horas: direto. Com horas: bloquear com mensagem + GP define data de encerramento

---

### Cenários-Limite

- Consultor vê custo/hora via DevTools — dados de custo não chegam ao frontend do consultor?
- Remover membro com 1h lançada em um único mês — sistema identifica o mês específico?
- Projeto com 12 meses e 8 membros — scroll horizontal sem quebrar layout em 1280px?

---

### Critério de Sucesso

GP edita horas de membro em < 20 segundos. Consultor vê próprias horas sem nenhum valor monetário. Aba Custos sem regressão. Confirmado que dados de custo não chegam ao frontend do consultor.

---

---

# JORNADA J9
## Custos do Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

Aba Custos existe com fornecedores, materiais e reembolsos em três seções independentes com scroll horizontal. Sem categorias para assinaturas, viagens, aluguel de equipamentos. GP precisa somar mentalmente para entender o custo total de um mês.

### Objetivo

GP cadastra todos os custos extra-labor em painel único com categorias claras e visão mensal consolidada de planejado vs. realizado.

---

### Jobs to be Done

**Funcionais:**
- Registrar todos os custos do projeto além de mão de obra em um único lugar
- Ver planejado vs. realizado por categoria e por mês
- Identificar qual categoria de custo está acima do orçado antes de estourar

**Emocionais:**
- Sentir que tenho controle sobre os gastos do projeto sem depender de planilha
- Não ser surpreendido com custos que não sabia que tinham ocorrido

**Social:**
- Ter dados precisos de custo para justificar um aditivo ou conversa com o cliente

---

### Fluxos

**F1 — Categorias Expandidas**

| Categoria | Tipo | Recorrência |
|---|---|---|
| `supplier` | Fornecedor | Mensal |
| `subscription` | Assinatura de app/serviço | Mensal |
| `equipment_rental` | Aluguel de equipamento | Mensal |
| `material` | Material/Equipamento | Pontual |
| `travel` | Viagem | Pontual |
| `other` | Outros | Ambos |

Schema: `project_suppliers` recebe campo `category` (default: `supplier`). `project_materials` recebe campo `category` (default: `material`).

**F2 — Reembolsos (somente leitura)**  
Chegam automaticamente do módulo de reembolsos aprovados e pagos. GP tem somente leitura — não cadastra, edita nem exclui. Um reembolso pago **impacta a margem** do projeto.

**F3 — Visão Consolidada Mensal**  
Gráfico de barras no topo: custo planejado total vs. realizado por mês. Breakdown por categoria abaixo.

**F4 — Tabs/Accordion por Categoria**  
Cada categoria tem sua lista de itens com planejado, realizado e botão de adicionar. Sem três tabelas independentes com scroll.

**F5 — `FinancialSummaryCard` mantida**  
Reposicionada como primeiro elemento após os cards de métricas.

---

### Cenários-Limite

- Fornecedor com período além da duração do projeto — alerta?
- Reembolso aprovado de funcionário não membro do projeto — aparece nos custos?
- Projeto sem nenhum custo extra-labor — estado vazio por categoria sem quebrar?

---

### Critério de Sucesso

GP cadastra 5 custos de categorias diferentes. Gráfico consolidado identifica mês com desvio. Sem três tabelas independentes com scroll horizontal. Equipe documenta 4 melhorias de UX vs. atual.

---

---

# JORNADA J10
## Stakeholders e NPS

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

`ProjectStakeholdersTab` existe com CRUD completo e matriz de influência/interesse. O `sponsorship_level` (promotor/neutro/detrator) é preenchido manualmente sem dados reais de satisfação. Não há sistema de pesquisa NPS — a satisfação real do cliente é desconhecida.

### Objetivo

GP gerencia stakeholders e coleta NPS de forma sistemática. O NPS é sempre uma métrica **do projeto como um todo** — não por stakeholder individual.

---

### Jobs to be Done

**Funcionais:**
- Mapear quem são os stakeholders do cliente e como gerenciar cada relacionamento
- Coletar feedback de satisfação do cliente de forma sistemática durante o projeto
- Saber se o cliente está satisfeito sem esperar a reunião de resultado

**Emocionais:**
- Sentir que o relacionamento com o cliente está sendo gerenciado proativamente
- Não ser surpreendido por insatisfação que poderia ter sido identificada antes

**Social:**
- Demonstrar para o admin que o relacionamento com o cliente está sendo cuidado

---

### Fluxos

**F1 — Modelo NPS do Projeto**  
```
NPS = % Promotores (nota ≥ 9) − % Detratores (nota ≤ 6)
```
Calculado do **conjunto** de respostas. Não existe "nota do stakeholder X" visível individualmente. `sponsorship_level` permanece como classificação estratégica **manual** do GP — não é calculado pelo NPS.

**F2 — Disparo Manual**  
GP seleciona stakeholders com email e dispara. Sistema gera token único por stakeholder. Página de pesquisa simples fora do sistema autenticado com pergunta NPS + comentário livre.

**F3 — Disparo Automático**  
Regras configuráveis por projeto: ao entrar em fase específica, data específica ou intervalo recorrente (a cada X semanas).

**F4 — Coleta de Respostas**  
Ao responder: sistema registra nota + comentário. GP recebe notificação in-app. Token expira em 30 dias.

**F5 — Visibilidade**
- **GP:** NPS total, % promotores/neutros/detratores, quem respondeu vs. não respondeu (sem nota individual)
- **Consultor:** NPS do projeto como número único

**F6 — Cards de Métricas**  
NPS do projeto, % promotores/neutros/detratores, total de stakeholders, último disparo.

---

### Schema Novo

`nps_surveys`, `nps_survey_recipients` (token único por destinatário), `nps_responses`, `nps_auto_triggers`

---

### Cenários-Limite

- Stakeholder sem email — não aparece na lista de disparo, sem erro?
- Resposta negativa (≤ 6) — GP recebe notificação com destaque de alerta?
- Token expirado — página exibe mensagem de expiração clara?
- NPS com 1 respondente — exibe 100 com aviso de baixa amostragem?

---

### Critério de Sucesso

GP dispara pesquisa manual para 3 stakeholders. Simula resposta via token. NPS calculado corretamente. Regra automática testada com mudança de fase. Consultor vê NPS como número sem comentários individuais.

---

---

# JORNADA J11
## Financeiro

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**⚠️ IMPOSTOS não são gerenciados no sistema — apenas no orçamento para markup. Remover da aba Financeiro.**

---

### Contexto e Problema

`ProjectFinancialTab` existe com KPIs e tabela de parcelas. Três lacunas: aba Comissão removida precisa migrar para cá; limites do admin existem no banco mas sem alertas contextuais na UI; fluxo de gestão de NFs é a atividade mais frequente e a UX atual não facilita o trabalho diário.

### Objetivo

GP acompanha saúde financeira em tempo real, gerencia ciclo de NFs com clareza, sistema sinaliza automaticamente quando um indicador viola os limites do admin.

**Permissões:** apenas GP e Admin. Consultor não tem acesso.

---

### Jobs to be Done

**Funcionais:**
- Acompanhar a margem real do projeto em tempo real
- Gerenciar ciclo de emissão e recebimento de NFs dentro do sistema
- Saber imediatamente quando uma NF está atrasada ou uma parcela não foi recebida

**Emocionais:**
- Sentir que a saúde financeira do projeto está visível e sob controle
- Não ser surpreendido pelo admin com perguntas sobre NFs que eu não lembro

**Social:**
- Ter dados financeiros precisos para justificar decisões junto ao admin e ao cliente

---

### Fluxos

**F1 — Cards de Métricas (5 KPIs)**

| KPI | Alerta |
|---|---|
| Receita contratada | — |
| Receita realizada | Amarelo se < 50% do período executado |
| Custo realizado | Vermelho se > custo planejado |
| Margem bruta atual | Vermelho se abaixo do mínimo do admin |
| Próxima NF | Vermelho se data já passou sem emissão |

**F2 — Migração das Comissões**  
Seção "Comissões" dentro desta aba com comissão planejada (do orçamento), realizada (do `useProjectCommissions`) e lista de comissões individuais marcáveis como pagas.

**F3 — Status de NF Inline**  
Pipeline por parcela: `pendente → emitida → enviada → recebida`. GP atualiza sem abrir dialog. Parcela com emissão vencida: destaque vermelho. Pagamento atrasado: destaque âmbar.

**F4 — Indicadores de Limite do Admin**  
Hook `useProjectHealthIndicators` compartilhado com J3. Verde: margem ≥ mínimo + 5pp. Vermelho: abaixo do mínimo.

**F5 — Integração com J18 (Aditivos)**  
Seção de receita exibe: original + aditivos aprovados + **total atualizado**. `total_value` nunca editado diretamente — apenas via aditivo aprovado.

---

### Cenários-Limite

- Projeto sem orçamento vinculado — comissão planejada exibe zero sem quebrar?
- Margem negativa — card exibe claramente "prejuízo"?
- Parcela marcada `recebida` antes do vencimento — não aparece como atrasada?

---

### Critério de Sucesso

GP identifica NFs pendentes, margem atual e pagamentos atrasados em 30 segundos. Comissões exibem dados corretos vindos da aba removida. Equipe documenta 3 melhorias de UX.

---

---

# JORNADA J12
## Arquivos do Projeto

**Impacto Origami Lab:** ⭐⭐ 2/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

Não existe repositório de arquivos no projeto além do `contract_url` como campo único. GP e consultores guardam documentos em emails e drives pessoais.

### Objetivo

GP e consultores acessam todos os documentos do projeto organizados em pastas com rastreabilidade de quem enviou e quando. **Jornada mais rápida de implementar no dia.**

---

### Jobs to be Done

**Funcionais:**
- Armazenar todos os documentos do projeto em um único lugar organizado
- Encontrar qualquer documento do projeto em menos de 30 segundos
- Compartilhar documentos com a equipe sem link externo

**Emocionais:**
- Sentir que a documentação não vai se perder quando alguém sair
- Não ter vergonha ao dizer que não encontro um documento que o cliente pediu

**Social:**
- Demonstrar organização ao cliente ao entregar documentação completa ao final

---

### Fluxos

**F1 — Estrutura de Pastas (single-level)**  
GP cria, renomeia, deleta pastas. Deletar pasta move arquivos para raiz — não exclui. Pastas sugeridas na criação do projeto: Contratos, Apresentações, Atas, Referências.

**F2 — Upload**  
Drop zone + botão. Tipos aceitos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, GIF. Máximo 20MB. Categoria obrigatória antes de confirmar.

**F3 — Listagem**  
Ícone por tipo de arquivo, nome clicável (visualiza ou baixa), categoria, quem enviou, quando, tamanho.

**F4 — Integração com Fechamento Comercial**  
Contrato anexado no fechamento (J9 Comercial) gera automaticamente um `project_files` com `category: 'contract'`. Aparece aqui sem upload manual.

---

### Schema Novo

Bucket Supabase Storage: `project-files`  
Tabelas: `project_folders`, `project_files`

### Permissões

| Ação | Consultor | GP | Admin |
|---|---|---|---|
| Ver arquivos | ✓ | ✓ | ✓ |
| Upload | ✓ | ✓ | ✓ |
| Criar pasta | ✗ | ✓ | ✓ |
| Deletar próprio | ✓ | ✓ | ✓ |
| Deletar de outro | ✗ | ✓ | ✓ |

---

### Cenários-Limite

- Arquivo com caracteres especiais no nome — path do Storage sanitizado?
- Consultor deleta arquivo de outro via DevTools — RLS bloqueia?
- URL expirada no Storage — link quebrado tratado graciosamente?

---

### Critério de Sucesso

GP faz upload de 4 arquivos em categorias e pastas diferentes. Consultor baixa arquivo. Consultor não consegue deletar arquivo de outro. Contrato do fechamento aparece automaticamente.

---

---

# JORNADA J13
## Portfólio de Projetos

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**⚠️ Migration de stages obrigatória no Sprint 1 junto com J1.**

---

### Contexto e Problema

`PortfolioKanbanBoard` existe com drag-and-drop funcional. Lacunas: stages desalinhados com o ciclo de vida de J1, nenhum filtro por GP/cliente/serviço, sem métricas no topo, e o card de projeto comunica dados insuficientes.

### Objetivo

GP abre Portfólio e em 30 segundos tem visão completa da saúde de seus projetos. Admin vê todos. Filtros permitem cruzar dados.

---

### Jobs to be Done

**Funcionais:**
- Ver todos os meus projetos ativos e seu estado de saúde em uma tela
- Mover um projeto de fase rapidamente sem precisar abrir cada um
- Filtrar o portfólio por cliente, GP ou fase para responder perguntas do admin

**Emocionais:**
- Sentir que tenho visibilidade da minha carteira mesmo com muitos projetos ativos
- Não ser pego de surpresa pelo admin perguntando sobre um projeto que eu esqueci

**Social:**
- Mostrar uma visão clara do portfólio em reuniões de gestão da empresa

---

### Fluxos

**F1 — Migration de Stages**  
`value_delivery → execution`, `value_book → remover`, `learning_case → case_and_learnings`. Executar no Sprint 1 junto com J1.

**F2 — Filtro Padrão por GP**  
Ao abrir: GP vê apenas seus projetos. Toggle "Todos os projetos" para ver o portfólio do tenant. Admin vê todos por padrão. Estado persistido na URL (`?view=mine` / `?view=all`).

**F3 — Filtros**  
GP Responsável (admin only), Cliente, Linha de Serviço, Fase, Busca textual. Badge "X filtros ativos" com botão de limpar.

**F4 — Card Redesenhado**  
*Topo:* badge de saúde (Saudável/Atenção/Crítico), nome, cliente.  
*Corpo:* GP, Linha/Serviço, datas, progresso roadmap (X/Y marcos), horas %.  
*Rodapé (GP/Admin):* próxima NF, margem atual %.  
*Alerta:* ícone se NF atrasada, margem crítica ou marco atrasado.

**F5 — Drag Restrito**  
GP arrasta apenas seus projetos. Projetos de outros GPs: visíveis, drag desabilitado (cursor diferente). Admin arrasta qualquer projeto.

**F6 — Cards de Métricas**  
Projetos ativos, projetos em risco (badge atenção/crítico), NFs em atraso, margem média.

---

### Cenários-Limite

- GP sem projetos — estado vazio com CTA para criar primeiro?
- GP tenta arrastar projeto de outro — drag não inicia?
- Filtros combinados com zero resultados — board exibe estado vazio por coluna?

---

### Critério de Sucesso

GP vê apenas seus projetos por padrão. Badge de saúde correto em projeto com desvio. GP não arrasta projeto de outro. Métricas refletem filtro ativo. Stages antigos removidos do banco.

---

---

# JORNADA J14
## Cards de Métricas por Aba (Transversal)

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5  
**⚡ Implementar nas PRIMEIRAS 2 HORAS. Desbloqueia todas as outras abas.**

---

### Contexto e Problema

Sem padronização, cada equipe implementa métricas de forma diferente — componentes distintos, estilos inconsistentes, sem reaproveitamento. O resultado é uma experiência fragmentada que prejudica a legibilidade do sistema.

### Objetivo

Todos os cards de métricas seguem o mesmo padrão visual com `ProjectMetricCard` e `ProjectMetricsBar`. Implementar e documentar com JSDoc antes das equipes de J3–J12 começarem.

---

### Jobs to be Done

**Funcionais:**
- Ver indicadores mais importantes de cada aba sem calcular manualmente
- Ter experiência consistente de métricas em todas as abas do projeto
- Identificar desvios de um projeto ao abrir qualquer aba

**Emocionais:**
- Sentir que o sistema me dá contexto suficiente para tomar decisões imediatas
- Não ter que abrir outras abas só para saber o estado atual de uma dimensão

**Social:**
- Apresentar dados relevantes ao cliente sem preparar relatório separado

---

### Fluxos

**F1 — `ProjectMetricCard`**  
Props: `label`, `value`, `variant` (`value` | `value_with_comparison` | `value_with_trend` | `status`), `comparison?`, `trend?`, `statusColor?`, `isLoading?`, `tooltip?`, `onClick?`

**F2 — `ProjectMetricsBar`**  
Container com grid responsivo: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`

**F3 — Regras de Comportamento**
- **Loading:** skeleton com mesma dimensão do card preenchido
- **Clicável:** cursor pointer + hover + navega para filtro na mesma aba
- **Tooltip:** ícone (?) com explicação do cálculo para métricas não óbvias
- **Zero:** exibe "0" — nunca oculta o card. Sem dados suficientes: exibe "—"
- **Mobile:** grid colapsa para 2 colunas em < 640px

---

### Critério de Sucesso

Componente usado em 5+ abas sem variação visual. JSDoc completo. Pelo menos 1 card clicável com filtro funcionando. Loading states consistentes.

---

---

# JORNADA J15
## Alocação da Equipe (Página)

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5  
**Rota:** `/alocacao` (página standalone na seção Projetos)

---

### Contexto e Problema

Página `/alocacao` existe com `AllocationOverview` mostrando horas planejadas vs. realizadas por funcionário mês a mês. Problema de UX: tabela horizontal com muitos meses cria mapa de calor denso e difícil de ler. GP não responde rapidamente "quem tem capacidade em setembro?". Atividades internas não integradas.

### Objetivo

GP abre Alocação e em 30 segundos identifica quem está disponível, sobrecarregado e desalocado — em projetos e atividades internas — no mês corrente e nos próximos 3 meses.

---

### Jobs to be Done

**Funcionais:**
- Ver em uma tela quem tem horas disponíveis nos próximos meses
- Identificar quem está sobrecarregado antes de alocar mais projetos
- Tomar decisões de alocação com dados de disponibilidade real

**Emocionais:**
- Sentir que as decisões de alocação são justas e baseadas em dados
- Não prometer capacidade para o cliente que a equipe não tem

**Social:**
- Demonstrar para a equipe que a distribuição de trabalho é feita com critério

---

### Fluxos

**F1 — Grade de Utilização**  
Linhas = funcionários (sobrecarregados primeiro), Colunas = mês atual + 3 próximos.

Cada célula:
- Barra de progresso horizontal com cor (verde 60–100%, amarelo 40–59% ou 101–115%, vermelho < 40% ou > 115%)
- Valor: "Xh / Yh (X%)"
- Tooltip: breakdown projetos vs. atividades internas

**F2 — Integração de Atividades Internas**  
Cada célula soma: horas em projetos (`project_member_months` + `project_timesheets`) com horas em atividades internas (`activity_timesheet_entries`).

**F3 — Filtros**  
Busca por nome, status de utilização (todos/sobrecarregados/adequados/subalocados/desalocados), projeto específico, cargo.

**F4 — Detalhe**  
Clicar em funcionário → `EmployeeTimesheetPage` (já existe). Validar que navegação funciona corretamente.

**F5 — Cards de Métricas**  
Sobrecarregados, desalocados, utilização média, horas disponíveis totais no mês.

---

### Cenários-Limite

- Funcionário em férias — capacidade reduzida automaticamente na célula?
- Funcionário admitido no meio do mês — capacidade proporcional calculada?
- 30+ funcionários — performance aceitável? Virtualização necessária?

---

### Critério de Sucesso

GP identifica disponível para novo projeto em 30 segundos. Grade legível com 15 funcionários. Atividades internas somadas à alocação de projetos. Equipe documenta 4 melhorias de UX vs. atual e mede tempo para encontrar informação de disponibilidade antes e depois.

---

---

# JORNADA J16
## Analytics de Projetos (Página)

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5  
**Rota:** `/analytics` (página existente, expandir)  
**⚠️ Depende de J10 (NPS) para o bloco de NPS do portfólio.**

---

### Contexto e Problema

Página `/analytics` existe com KPIs financeiros e utilização da equipe, mas filtro é por mês único. Impossível analisar um trimestre sem trocar mês a mês. Faltam: ranking de projetos por margem, performance por linha de serviço e análise de portfólio.

### Objetivo

GP identifica em < 5 minutos: projeto com menor margem, funcionário mais sobrecarregado, linha de serviço mais rentável.

---

### Jobs to be Done

**Funcionais:**
- Ver performance financeira de todos os projetos em período customizável
- Identificar quais projetos estão com margem abaixo do esperado
- Entender quais linhas de serviço são mais rentáveis para a empresa

**Emocionais:**
- Sentir que tenho os dados certos para melhorar a precificação dos próximos projetos
- Não precisar montar relatório em planilha para responder perguntas estratégicas

**Social:**
- Apresentar análises de performance do portfólio em reuniões de planejamento

---

### Fluxos

**F1 — Range Picker**  
De mês único para período customizável (padrão: últimos 3 meses). Presets: este mês, últimos 3 meses, últimos 6 meses, este ano. **O `useAnalyticsData` já suporta `startDate/endDate` — mudança principal é apenas na UI.**

**F2 — Permissões**  
GP vê apenas seus projetos. Admin vê todos. Filtro de GP visível apenas para admin.

**F3 — KPIs da Carteira**  
Receita realizada, receita projetada vs. realizada, margem bruta média vs. meta do admin, projetos ativos, projetos em risco, utilização média.

**F4 — Ranking de Projetos por Margem**  
Tabela de projetos ativos ordenados por margem % (maior → menor). Colunas: nome, cliente, GP, receita, custo, margem %, badge de saúde. Clicável → navega para o projeto.

**F5 — Receita e Custo Mensal**  
Gráfico de barras agrupadas (Recharts) com linha de margem sobreposta. Identifica tendências e sazonalidade.

**F6 — Breakdown de Custo por Categoria**  
Rosca com composição: mão de obra / fornecedores / materiais / reembolsos / assinaturas / viagens.

**F7 — Performance por Linha de Serviço**  
Tabela: receita, custo, margem média, número de projetos por linha. Identifica quais linhas são mais rentáveis.

**F8 — NPS do Portfólio**  
NPS agregado de todos os projetos com pesquisas respondidas no período. Exige J10 implementado.

---

### Cenários-Limite

- Período sem projetos ativos — estado vazio orientativo, não zeros confusos?
- GP sem projetos — CTA para criar primeiro?
- Linha de Serviço sem projetos no período — omite ou exibe zeros?

---

### Critério de Sucesso

GP responde as 3 perguntas-chave em < 5 minutos. Ranking clicável navega ao projeto. Equipe documenta tempo de resposta antes e depois da melhoria.

---

---

# JORNADA J18
## Gestão de Mudança de Escopo (Aditivos)

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

Não existe infraestrutura de aditivos. O `total_value` pode ser editado diretamente sem registro, aprovação ou rastreabilidade. Scope creep é a principal causa de erosão de margem em consultorias. O GP que entrega trabalho adicional sem registro formal perde receita e cria precedente.

### Objetivo

GP registra qualquer mudança de escopo como aditivo formal com impacto financeiro calculado antes da confirmação. Histórico vinculado ao projeto. `total_value` **nunca alterado diretamente — apenas via aditivo aprovado.**

---

### Jobs to be Done

**Funcionais:**
- Registrar formalmente qualquer pedido de escopo adicional do cliente
- Ver o impacto na margem antes de aprovar ou negociar um aditivo
- Ter histórico completo de mudanças de escopo vinculado ao projeto

**Emocionais:**
- Sentir que vou ser remunerado pelo trabalho adicional que o cliente pediu
- Não ter constrangimento ao cobrar por escopo adicional pois existe registro formal

**Social:**
- Demonstrar profissionalismo ao cliente ao ter processo formal de change management

---

### Fluxos

**F1 — Criar Aditivo**  
Dialog com: título, tipo (scope_addition / scope_reduction / timeline_extension / other), descrição, valor delta.

Sistema exibe em tempo real: contrato atual → delta → **novo total calculado** + **nova margem projetada**.

**Regra de aprovação:**
- Nova margem ≥ mínimo do admin: **auto-aprovação** (draft → approved)
- Nova margem < mínimo: **pending_approval** → notificação para o admin

**F2 — Aprovação pelo Admin**  
Notificação in-app com contexto completo. Admin aprova ou rejeita com comentário obrigatório em ambos os casos. GP notificado da decisão.

**F3 — Aplicação Automática após Aprovação**  
1. Atualiza `projects.total_value` para `new_total_value`
2. `scope_addition`: gera novas parcelas (GP define número e primeira data)
3. `scope_reduction`: marca parcelas futuras como canceladas proporcionalmente
4. Registra `applied_at` com timestamp
5. KPIs da aba Financeiro atualizam em tempo real

**F4 — Histórico de Aditivos na Aba Financeiro**

| Campo | Descrição |
|---|---|
| Status + badge | Draft / Pendente / Aprovado / Rejeitado |
| Título e tipo | Identificação rápida |
| Valor delta | +R$ X.XXX ou −R$ X.XXX |
| Novo total | Valor resultante |
| Solicitado por / quando | Rastreabilidade |
| Comentário de revisão | Visível em aprovados e rejeitados |

**F5 — Extensão de Prazo**  
`timeline_extension` com delta zero: auto-aprovação. Com delta positivo: fluxo normal. Atualiza `projects.end_date` após aprovação.

**F6 — Bloqueio de Edição Direta**  
Qualquer tentativa de editar `total_value` diretamente via `ProjectFormDialog` deve ser bloqueada ou redirecionada para criar um aditivo. Esta é a regra mais importante da jornada.

---

### Schema Novo — `project_change_requests`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | |
| `project_id` | uuid | |
| `tenant_id` | uuid | RLS |
| `title` | text | Título do aditivo |
| `description` | text | Descrição da mudança |
| `change_type` | text | scope_addition / scope_reduction / timeline_extension / other |
| `value_delta` | decimal | Positivo = aumento, negativo = redução |
| `new_total_value` | decimal | Novo total após o aditivo |
| `status` | text | draft / pending_approval / approved / rejected |
| `requested_by` | uuid | GP que criou |
| `requested_at` | timestamptz | |
| `reviewed_by` | uuid | Admin |
| `reviewed_at` | timestamptz | |
| `review_notes` | text | Comentário do revisor |
| `applied_at` | timestamptz | Quando aplicado ao projeto |

---

### Cenários-Limite

- Dois aditivos pendentes: o segundo usa `new_total_value` do primeiro ou o original?
- Admin rejeita: `total_value` permanece inalterado?
- Aditivo de redução gerando margem negativa — alerta explícito antes do envio?
- Projeto `completed` — criação de aditivo bloqueada?
- Data primeira NF do aditivo anterior à aprovação — validação bloqueia?

---

### Critério de Sucesso

GP cria aditivo que viola limite → admin aprova → `total_value` atualizado com novas parcelas geradas. GP cria segundo aditivo abaixo do limite → auto-aprovado. Seção Aditivos na aba Financeiro exibe ambos com status corretos. **`total_value` nunca alterado diretamente confirmado pela equipe testando via DevTools.**

---

---

## Resumo das Dependências entre Jornadas

| Dependência | Impacto |
|---|---|
| **J1 antes de tudo** | Estrutura de abas e stages corretos — pré-requisito absoluto |
| **J14 nas primeiras 2 horas** | `ProjectMetricCard` disponível antes de J3–J12 |
| **Admin J4 junto com J1** | Migration de stages deve rodar com migration de serviços |
| **J6 antes de J7** | `project_card_column_history` necessário para cycle time |
| **J2 e J8 compartilham hook** | `useEmployeeAvailability` criado em J2, reutilizado em J8 e J15 |
| **J10 antes de J16** | NPS do portfólio em Analytics requer J10 implementado |
| **J11 e J18 acoplados** | Seção de aditivos em J11 depende do schema de J18 |
| **J3 e J11 compartilham hook** | `useProjectHealthIndicators` centraliza lógica de saúde |

---

## Prioridade de Execução Sugerida

### Sprint 1 — Fundações (obrigatório)
1. **Admin J4** — Migration do catálogo (coordenar com equipe Tsuru)
2. **J1** — Estrutura e migration de stages (executar junto com Admin J4)
3. **J14** — Componentes de métricas base (primeiras 2 horas)
4. **J13** — Portfólio: migration de stages + filtro por GP

### Sprint 2 — Core
5. **J2** — Planejamento com disponibilidade real
6. **J3** — Visão Geral com badge de saúde
7. **J4** — Objetivos com check-in inline
8. **J5** — Roadmap com tipos e timeline reformulada

### Sprint 3 — Avançado
9. **J6** — Atividades (Kanban) — maior complexidade
10. **J8** — Equipe (nova aba separada de Custos)
11. **J9** — Custos com categorias expandidas
12. **J10** — Stakeholders + NPS
13. **J11** — Financeiro com NFs inline + Comissões migradas

### Sprint 4 — Polimento
14. **J7** — Métricas (depende de J6)
15. **J12** — Arquivos (mais rápido de implementar)
16. **J15** — Alocação com grade de utilização reformulada
17. **J16** — Analytics com range picker + ranking
18. **J18** — Aditivos (maior impacto estratégico)

---

## Antes de Começar — Checklist da Equipe

- [ ] Ler todas as jornadas que vão atacar no Sprint 1
- [ ] Percorrer o fluxo existente como o GP e documentar fricções
- [ ] Confirmar que Admin J4 (migration) foi executada antes de qualquer trabalho no catálogo
- [ ] Criar ramo no Git para cada jornada
- [ ] Combinar qual dev pega qual jornada para evitar conflitos de arquivo

---

*Documento gerado para o Hackathon Origami Pulse — 04/06/2026*  
*Equipe Koi 🐟 — GP Comercial + GP Projetos*