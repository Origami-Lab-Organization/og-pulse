# Hackathon Origami Pulse
## Jornadas da Persona — Funcionário / Consultor
### Guia Completo para as Equipes

---

**Data:** 04 de junho de 2026 · Origami Lab · Formiga MG  
**Persona:** Equipe Origami Lab — Consultores e funcionários operacionais  
**Equipe responsável:** 📦 Masu (Funcionário, 3 pessoas)  
**Total de jornadas:** 12

---

## Quem é o Funcionário / Consultor

O Consultor é quem executa o trabalho nos projetos. Ele é a persona que mais acessa o sistema no dia a dia — lanças horas toda semana, move cards no kanban, solicita reembolsos, vê notificações, bate ponto. Mas é também a persona que tem menos contexto sobre o sistema: chegou via convite, nunca usou o Pulse antes.

**O que tira o Consultor do sono:**
- Não saber o que precisa fazer no projeto hoje
- Esquecer de lançar as horas e ter que reconstruir o que fez na semana
- Precisar pedir ao RH para ver o próprio holerite
- Bater ponto correndo porque está longe do computador

---

## Meu Espaço — O universo do Consultor

O consultor opera exclusivamente dentro do **Meu Espaço** — uma seção dedicada sem acesso a módulos de gestão (Comercial, Projetos, RH). Exceto quando navega em projetos onde está alocado.

| Funcionalidade | Rota |
|---|---|
| Onboarding | `/onboarding` |
| Caixa de Entrada | `/inbox` |
| Meu Kanban | `/meu-kanban` |
| Meus Projetos | `/meus-projetos` |
| Timesheet | `/my-timesheet` |
| Reembolsos | `/reimbursements` |
| Documentos | `/documentos` |
| Perfil | `/meu-perfil` |
| Ponto | `/ponto` |

---

## PWA — App no Celular

O Pulse terá uma PWA (Progressive Web App) que funciona no celular sem necessidade de instalar pela loja. Cobre exclusivamente o Meu Espaço. O caso de uso principal é o ponto — bater entrada e saída de qualquer lugar. Detalhes em J12.

---

---

# JORNADA J1
## Convite e Primeiro Acesso

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

A infraestrutura existe: `must_change_password`, `temp_password`, `status: 'aguardando_confirmacao'`, Edge Function `create-employee-user`, `resendInvite` e `updatePassword`. O que não existe: uma tela dedicada de primeiro acesso com boa UX, um mecanismo de intercepção para redirecionar usuários com `must_change_password: true`, e clareza no email de convite.

### Objetivo

Funcionário recebe o convite por email, clica no link, faz login com a senha temporária, define sua senha permanente e entra no sistema em menos de 3 minutos — sem ajuda de ninguém.

### Estado Atual

Infraestrutura de convite implementada. Sem tela dedicada de primeiro acesso. Sem guard de intercepção de rota. Email de convite pode ser genérico do Supabase.

---

### Jobs to be Done

**Funcionais:**
- Acessar o sistema pela primeira vez sem precisar de ajuda de ninguém
- Criar minha senha permanente de forma segura no primeiro acesso
- Entender claramente o que preciso fazer para completar o acesso

**Emocionais:**
- Sentir que fui bem recebido na empresa desde o primeiro contato com o sistema
- Não sentir ansiedade por não saber qual é a senha ou o que fazer primeiro

**Social:**
- Ter uma experiência de primeiro acesso que reflita a qualidade da empresa que estou entrando

---

### Fluxos

**F1 — Email de Convite Melhorado**  
Verificar o template atual do email enviado pela Edge Function. Deve conter:
- Remetente identificado (Origami Pulse / nome da empresa)
- Saudação com nome do funcionário
- Nome da empresa que está convidando
- Senha temporária em destaque (copiável)
- Botão único "Acessar o Origami Pulse"
- Instruções: "Você precisará criar uma nova senha no primeiro acesso"
- Link com validade de 7 dias

**F2 — Login com Senha Temporária**  
Campo de email pré-preenchido com o email do convite (passado como parâmetro na URL do link). Funcionário digita apenas a senha temporária.

**F3 — Guard de Intercepção**  
Após autenticação, `AuthContext` verifica `employee.must_change_password`. Se `true`: redirect para `/primeiro-acesso` independente da rota. Qualquer navegação para outra rota enquanto `must_change_password: true` redireciona de volta.

**F4 — Tela `/primeiro-acesso`**  
Tela simples sem sidebar:
- Boas-vindas com nome do funcionário e nome da empresa
- Explicação: "Por segurança, você precisa criar uma senha pessoal antes de continuar"
- Campo nova senha com força em tempo real
- Campo confirmar nova senha
- Critérios visíveis: 8+ caracteres, 1 maiúscula, 1 número, 1 especial
- Botão "Criar minha senha e entrar"

Ao confirmar: `updatePassword` existente limpa `must_change_password`, `temp_password` e muda status para `ativo`. Redireciona para `/onboarding` (J2).

**F5 — Link Expirado**  
Se o link expirou (> 7 dias): tela clara com mensagem "Este link expirou. Entre em contato com o seu gestor para receber um novo convite." — sem mensagem técnica do Supabase.

---

### Cenários-Limite

- Funcionário tenta acessar `/projetos` diretamente com `must_change_password: true` — redirect funciona?
- Funcionário abre link em browser com outra conta logada — sem conflito de sessão?
- Senha temporária digitada errada 3 vezes — mensagem compreensível?
- Admin reenvio convite — senha temporária anterior é invalidada?

---

### Critério de Sucesso

Funcionário novo acessa em menos de 3 minutos sem ajuda. Tela de primeiro acesso bloqueia qualquer navegação até senha ser trocada. Email de convite testado e aprovado como "profissional". Equipe documenta o estado atual do email e quantas melhorias foram feitas.

---

---

# JORNADA J2
## Onboarding

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

Após criar a senha em J1, o funcionário entra num sistema que nunca viu. Não existe nenhuma orientação sobre o que fazer primeiro, onde lançar horas, como ver seus projetos ou como pedir reembolso. Resultado: o GP tem que orientar cada pessoa nova manualmente.

### Objetivo

Funcionário completa onboarding em menos de 5 minutos e termina sabendo onde fazer as 3 ações mais frequentes: lançar horas, ver projetos, ver notificações.

### Estado Atual

Não existe. Campo `onboarding_completed` precisa ser adicionado à tabela `employees`.

---

### Jobs to be Done

**Funcionais:**
- Aprender o sistema nas partes que importam para o dia a dia em menos de 5 minutos
- Saber onde lançar horas, ver projetos e ver notificações
- Poder pular o onboarding e voltar depois se preferir explorar sozinho

**Emocionais:**
- Sentir que o sistema foi pensado para me ajudar, não para me complicar
- Não sentir que estou perdido num sistema novo sem nenhuma orientação

**Social:**
- Ser capaz de usar o sistema com autonomia sem precisar pedir ajuda para colegas

---

### Fluxos

**F1 — Novo campo no banco**  
Tabela `employees`: adicionar `onboarding_completed: boolean DEFAULT false` e `onboarding_completed_at: timestamptz`.

**F2 — Tela de Boas-Vindas**  
Primeira tela do onboarding (fora do layout do sistema):
- Avatar com iniciais do funcionário
- "Bem-vindo(a) ao Origami Pulse, [Nome]!"
- "Você está no workspace da [Nome da Empresa]"
- "Em 3 passos rápidos você vai conhecer o essencial"
- Botão "Começar" + link "Pular e ir direto para o sistema"

**F3 — Os 3 Passos**

*Passo 1 — Meu Espaço:*  
"Aqui é o seu espaço" — descrição de: kanban, timesheet, reembolsos e documentos. Miniatura da navegação lateral.

*Passo 2 — Timesheet:*  
"Registre suas horas aqui" — como funciona o pré-preenchimento. Card de exemplo com horas sugeridas e campo de ajuste.

*Passo 3 — Caixa de Entrada:*  
"Suas notificações chegam aqui" — aprovações de reembolso, alertas, documentos. Preview de um card de notificação.

**F4 — Tela Final com Atalhos**  
"Tudo certo, [Nome]! Você está pronto para usar o Origami Pulse."  
Três atalhos rápidos: "Ver meus projetos" / "Lançar minhas horas" / "Ir para o dashboard"  
Sistema seta `onboarding_completed: true` ao renderizar esta tela.

**F5 — Banner para Quem Pulou**  
Banner não-intrusivo no topo do dashboard por 7 dias: "Quer conhecer o sistema em 3 passos rápidos?" Após 7 dias ou "Não mostrar mais": `onboarding_completed: true`.

---

### Cenários-Limite

- Funcionário com role `manager` (GP) — onboarding menciona seções de projetos ou é idêntico ao consultor?
- `onboarding_completed: true` setado manualmente no banco — guard não mostra o onboarding novamente?
- Funcionário acessa `/onboarding` via URL direta após concluir — redireciona para dashboard?

---

### Critério de Sucesso

Funcionário completa 3 passos em menos de 3 minutos. Banner aparece para quem pulou. `onboarding_completed` setado corretamente em ambos os caminhos. Equipe documenta se admin também precisa de onboarding.

---

---

# JORNADA J3
## Caixa de Entrada

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

`InboxButton` na navbar abre o `ReimbursementInbox` como sheet lateral. Funciona apenas para reembolsos. Não há página dedicada, não há todos os tipos de notificação, não há Realtime para novas notificações.

### Objetivo

Consultor abre Caixa de Entrada e em menos de 30 segundos entende o que precisa de atenção hoje. Notificações chegam em tempo real sem recarregar a página.

### Estado Atual

Tabela `notifications` existe. `useUnreadNotificationsCount` implementado. `InboxButton` com badge. Sheet lateral com reembolsos. Migrar de sheet para página dedicada.

---

### Jobs to be Done

**Funcionais:**
- Ver todas as notificações e mensagens do sistema em um único lugar
- Saber imediatamente o que precisa da minha atenção hoje
- Navegar da notificação para a ação relevante em um clique

**Emocionais:**
- Sentir que não vou perder nenhuma informação importante do sistema
- Não ter ansiedade por não saber se alguma coisa ficou sem resposta

**Social:**
- Ser visto como um profissional responsivo que não deixa nada passar

---

### Fluxos

**F1 — Nova Rota `/inbox`**  
Substituir sheet lateral por página dedicada. `InboxButton` na navbar navega para `/inbox` em vez de abrir sheet. Sheet atual descontinuado.

**F2 — Layout com Dois Painéis**  
- Coluna esquerda (30%): lista de notificações — ícone por tipo, título, preview, data relativa, indicador de não-lido
- Coluna direita (70%): detalhe da notificação selecionada com texto completo e botão de ação primária
- Mobile (PWA): uma coluna — lista → toca → detalhe → botão voltar

**F3 — Tipos de Notificação**

| Tipo | Para quem | Ação |
|---|---|---|
| `reimbursement_approved` | Consultor | "Ver reembolso" |
| `reimbursement_paid` | Consultor | "Ver comprovante" |
| `reimbursement_rejected` | Consultor | "Ver motivo" |
| `reimbursement_pending` | GP/Admin | "Revisar" |
| `document_available` | Consultor | "Ver documento" |
| `project_started` | Consultor | "Ver projeto" |
| `project_health_alert` | GP | "Ver projeto" |
| `nps_response_received` | GP | "Ver resposta" |
| `timesheet_reminder` | Consultor | "Lançar horas" |
| `card_assigned` | Consultor | "Ver atividade" |
| `system` | Todos | Apenas informativo |

**F4 — Tabs de Filtro**  
Todas, Não lidas, Reembolsos, Projetos, Documentos.

**F5 — Marcar como lido**  
Ao selecionar: marcado automaticamente (`read_at` setado). Botão "Marcar todas como lidas". Badge da navbar atualiza via Realtime.

**F6 — Supabase Realtime**  
Listener na tabela `notifications` filtrado por `recipient_id`. Novas notificações aparecem sem reload. Badge atualiza instantaneamente.

---

### Cenários-Limite

- 50+ notificações não lidas — lista performa bem? Paginação necessária?
- Notificação com `action_url: null` — botão de ação não aparece sem quebrar layout?
- Dois dispositivos abertos — notificação lida em um aparece como lida no outro via Realtime?

---

### Critério de Sucesso

Consultor abre inbox e vê todas as notificações. Clique navega para a ação relevante. Badge atualiza em tempo real. Estado vazio apresentado corretamente. Equipe documenta quais tipos de notificação já existem no banco e quais precisaram ser adicionados.

---

---

# JORNADA J4
## Meu Kanban

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

Consultor não tem nenhum lugar no sistema para gerenciar seu trabalho pessoal e ver as atividades de projeto atribuídas em uma visão unificada. Usa ferramentas externas (Trello, post-its), quebrando o princípio de base única de informação.

### Objetivo

Consultor vê em uma tela todas as tarefas pessoais e atividades de projeto atribuídas a ele. Mover um card de projeto no kanban pessoal atualiza o board do projeto automaticamente.

### Estado Atual

Não existe. Construção do zero. Depende de J6 do GP Projetos (board de atividades) para os cards de projeto aparecerem.

---

### Jobs to be Done

**Funcionais:**
- Ver num único lugar todas as minhas tarefas pessoais e atividades de projeto
- Gerenciar meu trabalho sem precisar de ferramenta externa como Trello
- Mover uma atividade de projeto e ter o board do projeto atualizado automaticamente

**Emocionais:**
- Sentir que tenho controle sobre tudo que preciso fazer hoje
- Não ter a sensação de que algo importante pode estar sendo esquecido

**Social:**
- Ser percebido como organizado e autônomo pela equipe e pelo GP

---

### Fluxos

**F1 — Arquitetura: View Agregada de Duas Fontes**

| Fonte | Entidade | Dono dos dados |
|---|---|---|
| Atividades pessoais | `personal_tasks` (nova tabela) | Consultor — cria, edita, exclui |
| Cards de projetos | `project_cards` (de J6 do GP) | Projeto — apenas mover é permitido |

**F2 — Colunas Fixas e Mapeamento**  
3 colunas fixas: **A Fazer | Fazendo | Feito**

Cards de projeto aparecem mapeados com base em `project_column_status_mapping` (configurado pelo GP durante o planejamento em J2 de GP Projetos):

| Coluna do projeto | Status no Meu Kanban |
|---|---|
| `backlog`, `todo` | A Fazer |
| `in_progress`, `review` | Fazendo |
| `done` | Feito |

Se o GP não configurou o mapeamento: aviso no kanban "O GP do projeto [Nome] ainda não configurou o mapeamento. Fale com ele para ativar."

**F3 — Card Pessoal vs. Card de Projeto**  
- Card pessoal: badge "Pessoal" cinza, consultor tem controle total
- Card de projeto: badge colorido com nome do projeto, apenas mover é permitido

**F4 — Movimento Bidirecional**  
Ao arrastar card de projeto para outra coluna no Meu Kanban:
1. Sistema identifica o `personal_status` da coluna de destino
2. Encontra qual coluna do board do projeto corresponde a esse status
3. Move `project_cards.column_id` para a coluna correspondente
4. Mudança reflete imediatamente no board do projeto para o GP

**F5 — Criação de Tarefa Pessoal**  
Clicar "+ Adicionar" em qualquer coluna → digitar título → Enter. Campos avançados: descrição, data de entrega, prioridade.

**F6 — Filtros**  
Toggle: Todos / Pessoais apenas / Projetos (com filtro de projeto específico).

---

### Schema Novo

**Tabela `personal_tasks`:**  
`id`, `tenant_id`, `employee_id`, `title`, `description`, `status` (todo/doing/done), `priority`, `due_date`

**Tabela `project_column_status_mapping`:**  
`id`, `project_id`, `column_id`, `personal_status` (todo/doing/done), `tenant_id`

---

### Cenários-Limite

- GP move um card no projeto — kanban pessoal do consultor atualiza via Realtime?
- Consultor move card para "Feito" sem ser o responsável — sistema bloqueia com mensagem?
- Consultor desalocado de um projeto — cards daquele projeto desaparecem do kanban?
- 30+ cards atribuídos — performance aceitável?

---

### Critério de Sucesso

Consultor cria 3 tarefas pessoais e vê cards de projeto de 2 projetos nas colunas corretas. Move card de projeto para "Fazendo" e o board do projeto reflete a mudança via Realtime. GP vê a mudança no board do projeto imediatamente.

---

---

# JORNADA J5
## Meus Projetos

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

Consultor não tem visão consolidada dos projetos em que está alocado. Para ver um projeto precisa navegar pela área do GP — uma interface que não foi feita para ele.

### Objetivo

Consultor abre Meus Projetos e em 30 segundos tem visão clara dos projetos ativos, fases e próximos marcos.

### Estado Atual

`useMyProjectMemberships` hook existe. Sem página dedicada `/meus-projetos`.

---

### Jobs to be Done

**Funcionais:**
- Ver todos os projetos em que estou alocado e seu estado atual
- Acessar as informações de um projeto rapidamente sem navegar pela área do GP
- Saber qual é o próximo marco relevante dos meus projetos

**Emocionais:**
- Não ter a sensação de estar trabalhando no escuro sem saber o panorama do projeto
- Sentir que tenho contexto suficiente para trabalhar com autonomia

**Social:**
- Responder perguntas sobre o projeto sem precisar consultar o GP

---

### Fluxos

**F1 — Grid de Cards**  
Usar `useMyProjectMemberships` como fonte. Filtro padrão: apenas projetos ativos (`execution`, `results_presentation`, `case_and_learnings`).

Cada card exibe:
- Badge de fase (Planejamento/Em Execução/Apresentação/C&A)
- Nome do projeto, cliente
- GP responsável (avatar + nome)
- Papel do consultor neste projeto
- Próximo marco (se houver)
- Contagem de atividades atribuídas ao consultor

**F2 — Nenhum dado financeiro**  
Sem receita, custo, margem, valores. Apenas informações operacionais.

**F3 — Projeto em Planejamento**  
Card exibe badge "Em Preparação". Ao clicar: "Este projeto ainda está em fase de planejamento. O GP irá notificá-lo quando iniciar."

**F4 — Estado Vazio**  
"Você ainda não está alocado em nenhum projeto. Quando o GP te adicionar a um projeto, ele aparecerá aqui."

**F5 — Widget no Dashboard**  
O dashboard de Meu Espaço exibe widget compacto com os 3 projetos mais recentes e link "Ver todos →".

---

### Cenários-Limite

- Consultor acessa `/projetos/:id` de projeto em que NÃO está alocado via URL direta — RLS bloqueia?
- 10+ projetos — grid responsivo sem quebrar em mobile?

---

### Critério de Sucesso

Consultor abre Meus Projetos e vê projetos ativos com fase e próximo marco. Clicar em projeto abre view correta sem dados financeiros. RLS bloqueia acesso a projetos onde não está alocado.

---

---

# JORNADA J6
## Navegação e Execução no Projeto

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**Esta é a jornada de maior volume de acesso do sistema.**

---

### Contexto e Problema

O `ProjectDetail.tsx` foi construído do ponto de vista do GP. O consultor que entra no projeto se depara com uma interface densa não pensada para quem executa. Ele precisa de 5+ cliques para chegar ao primeiro card que precisa trabalhar.

### Objetivo

Consultor acessa projeto, entende imediatamente o que precisa fazer hoje e trabalha nas atividades sem fricção — em menos de 5 minutos de navegação. **Meta: máximo 3 cliques do login até o primeiro card aberto.**

### Estado Atual

`ProjectDetail.tsx` existe. Aba padrão é Visão Geral para todos. Abas Custos e Financeiro precisam ser invisíveis para o consultor. Permissões granulares dependem de J1 do GP Projetos.

---

### Jobs to be Done

**Funcionais:**
- Entrar num projeto e saber imediatamente o que preciso fazer hoje
- Abrir, comentar e mover atividades do projeto sem fricção
- Ver o contexto do projeto (roadmap, objetivos, stakeholders) quando precisar

**Emocionais:**
- Sentir que o sistema me apoia no trabalho em vez de adicionar burocracia
- Não sentir que estou perdendo tempo navegando para encontrar minhas tarefas

**Social:**
- Ser percebido como proativo e organizado pelos colegas e pelo GP

---

### Fluxos

**F1 — Aba Padrão = Atividades**  
Para consultor (`!is_gerente`): aba padrão ao abrir o projeto é **Atividades**, não Visão Geral. Lógica no `ProjectDetail.tsx`: `defaultTab = isManager ? 'overview' : 'activities'`

**F2 — Filtro "Apenas Meus Cards" Ativo por Padrão**  
Na aba Atividades para o consultor: filtro "Apenas meus cards" ativo por padrão. Toggle "Ver todos" para ver o board completo.

**F3 — Abas Invisíveis para Consultor**  
Abas Custos e Financeiro não aparecem no `TabsList` para o consultor — não apenas desabilitadas, completamente ausentes. RLS bloqueia acesso via URL de qualquer forma.

**F4 — Visão das Abas para Consultor**

| Aba | O que o consultor vê |
|---|---|
| Visão Geral | Header, progresso operacional (sem financeiro), equipe, atividade recente |
| Objetivos | OKRs em somente leitura |
| Roadmap | Timeline em somente leitura. Clique em marco filtra o Kanban |
| **Atividades** | Board com seus cards em destaque. Pode criar, mover, comentar |
| Métricas | Todas as métricas sem restrição |
| Equipe | Horas planejadas vs. realizadas sem valores monetários |
| Stakeholders | Nome, cargo, empresa, contato, NPS score |
| Arquivos | Visualizar, baixar, fazer upload |

**F5 — Trabalhar no Card**  
Ao clicar num card: painel lateral abre. Consultor pode:
- Editar título (se for o responsável)
- Mover entre colunas (exceto para "done" se não for responsável)
- Adicionar comentário com upload de arquivo
- Ver histórico auditável (somente leitura)
- Ver marco vinculado (link para aba Roadmap)

**F6 — Roadmap como Contexto de Trabalho**  
Consultor frequentemente acessa o Roadmap antes de uma reunião. Clicar num marco filtra o Kanban para mostrar apenas os cards vinculados a ele: "O que preciso fazer para a Release v1.0 acontecer?"

**F7 — Medir os 3 Cliques**  
Equipe mede: login → Meus Projetos → Projeto X → Aba Atividades = 3 cliques. Documentar o caminho atual e o novo.

---

### Cenários-Limite

- Consultor tenta acessar aba Custos via URL (`/projetos/:id?tab=costs`) — RLS bloqueia e UI redireciona?
- Card aberto no painel enquanto outro membro comenta — novo comentário aparece sem reload?
- Projeto em Planejamento sem cards criados — estado vazio orientativo na aba Atividades?
- Consultor em mobile (PWA) clica em card com painel lateral — painel ocupa tela cheia?

---

### Critério de Sucesso

Consultor acessa projeto e chega na aba Atividades como padrão. Abre card, comenta, move para "Fazendo". Meu Kanban reflete a mudança via Realtime. Máximo 3 cliques do login até o primeiro card aberto — equipe mede e documenta.

---

---

# JORNADA J7
## Timesheet

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

`MyTimesheet.tsx` existe com lançamento semanal e `useMyAllocationData` calculando capacidade por dias úteis. O pré-preenchimento automático não existe — o consultor precisa lembrar e digitar os valores do zero toda semana.

### Objetivo

Consultor abre o timesheet e vê campos já pré-preenchidos com base na alocação mensal distribuída proporcionalmente pelos dias úteis. Confirma, ajusta o que for necessário e finaliza em menos de 2 minutos.

### Estado Atual

Lançamento semanal funcional. `useMyAllocationData` calcula planejado vs. realizado. `allDailyTotals` rastreia totais diários. Sem pré-preenchimento automático.

---

### Jobs to be Done

**Funcionais:**
- Lançar as horas da semana em menos de 2 minutos com campos pré-preenchidos
- Confirmar as horas sem precisar lembrar exatamente o que fiz em cada dia
- Registrar ausências e atividades internas no mesmo lugar que horas de projeto

**Emocionais:**
- Sentir que o lançamento de horas é rápido e não interrupe o meu trabalho
- Não sentir culpa ou estresse por não ter lançado as horas no prazo

**Social:**
- Ser visto como comprometido com o processo da empresa ao lançar horas em dia

---

### Fluxos

**F1 — Lógica de Pré-preenchimento (Opção C)**  
```
horas_por_dia = planned_hours_for_month ÷ total_working_days_in_month

Pre-fill de um dia = horas_por_dia se é dia útil (não fds, não feriado)
                  = 0 se é fds ou feriado
```
O `useMyAllocationData` já usa `countWorkingDays` com feriados — adaptar para retornar valor por dia.

Novo hook: `useTimesheetPrefill(employeeId, weekDays, projects)` → `Record<projectId, Record<date, hours>>`

**F2 — Visual de "Sugestão" vs. "Lançado"**  
Células sem lançamento exibem valores em cor mais clara com badge "Sugestão". Ao confirmar: visual muda para "Lançado". Pré-preenchimento só aparece em células ainda sem lançamento — nunca substitui lançamentos existentes.

**F3 — Confirmar Semana**  
Botão "Confirmar semana" ou confirmação por projeto. O consultor pode editar qualquer célula antes de confirmar.

**F4 — Atividades Internas**  
`useMyActivityTypes` busca atividades configuradas pelo admin: Folga, Licença Médica, Atestado, Recesso. Aparece abaixo dos projetos com divider "Atividades Internas". Sem pré-preenchimento para ausências.

**F5 — Aviso de Projeto Sem Planejamento**  
`unplannedProjectIds` já existe — projetos sem `project_member_months` mostram ícone `CircleAlert`. Tooltip: "Este projeto não possui alocação planejada para o mês. Fale com o GP para configurar."

**F6 — Layout Mobile (PWA)**  
Um projeto por vez com os 5 dias da semana abaixo como cards individuais. Campos de hora grandes para toque fácil.

---

### Cenários-Limite

- Semana que cruza dois meses — planejamentos dos dois meses usados para os dias correspondentes?
- Mês sem planejamento em nenhum projeto — pré-preenchimento zero sem dividir por zero?
- Semana futura — campos bloqueados para lançamento (já existe `isFutureWeek`)?

---

### Critério de Sucesso

Consultor abre timesheet de semana sem lançamentos e vê campos pré-preenchidos. Edita 2 valores, confirma, e lançamentos aparecem como salvos. Semana com feriado distribui corretamente. Equipe documenta quantas linhas de código foram necessárias para o pré-preenchimento.

---

---

# JORNADA J8
## Reembolso

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

Módulo existe com fluxo funcional completo. A lacuna central está na transparência para o consultor: após criar o pedido, não há uma visão clara de onde está no pipeline, quem precisa agir e quando vai receber.

### Objetivo

Consultor cria reembolso em menos de 3 minutos, acompanha status em tempo real e é notificado a cada mudança até o pagamento.

### Estado Atual

`reimbursement_requests` com pipeline de status, `reimbursement_items`, bucket de recibos, auto-aprovação para GP+projeto, notificações em cada etapa. Melhorar UX da linha de status e fluxo de rejeição/correção.

---

### Jobs to be Done

**Funcionais:**
- Solicitar reembolso de uma despesa em menos de 3 minutos com foto do recibo
- Acompanhar o status sem precisar perguntar para o GP ou admin
- Saber exatamente quando e quanto vou receber de volta

**Emocionais:**
- Sentir que o processo de reembolso é justo e transparente
- Não sentir constrangimento de ter que cobrar um reembolso que ficou esquecido

**Social:**
- Confiar que a empresa vai processar o reembolso sem precisar ficar lembrando

---

### Fluxos

**F1 — Criar Reembolso**  
Toggle: "Reembolso de Projeto" (selecionar projeto de `useMyProjectMemberships`) ou "Reembolso Administrativo" (selecionar categoria).  
Itens de despesa: data, descrição, valor. Botão "+ Adicionar item". Upload de recibos (foto ou PDF).

**F2 — Linha de Status Visual**  
```
Enviado ──────── Aprovado ──────── Pago
  (GP ou Admin)    (Admin)
```
Ou quando rejeitado:
```
Enviado ──── Rejeitado → [Corrigir e Reenviar]
```
Cada etapa com ícone, label e timestamp de quando ocorreu.

**F3 — Notificações por Etapa**

| Evento | Notificação para consultor |
|---|---|
| Criado | "Pedido enviado — aguardando aprovação" |
| Aprovado | "Aprovado — aguardando pagamento pelo administrativo" |
| Rejeitado | "Rejeitado — [Motivo]. Clique para corrigir e reenviar." |
| Pago | "Pago em [data]. Verifique sua conta." |

**F4 — Corrigir e Reenviar (quando rejeitado)**  
Botão "Corrigir e Reenviar" abre formulário pré-preenchido via `corrected_from_id`. Consultor ajusta e reenvia. Histórico mantém ambas as versões.

**F5 — Impacto nos Custos do Projeto**  
Reembolso pago com `project_id` aparece automaticamente na aba Custos do projeto como "Reembolso realizado". Impacta a margem. GP tem somente leitura.

**F6 — Mobile (PWA)**  
Câmera integrada: `input[type=file][accept=image/*][capture=environment]` abre câmera diretamente. Consultor tira foto do recibo na hora.

---

### Cenários-Limite

- Reembolso sem nenhum item de despesa — formulário bloqueia?
- GP rejeita com motivo em branco — sistema obriga preenchimento?
- Consultor acessa reembolso de outro via URL — RLS bloqueia?

---

### Critério de Sucesso

Consultor cria reembolso com 3 itens e comprovantes. Acompanha pending → approved → paid com notificação em cada etapa. GP rejeita com motivo, consultor corrige e reenvia. Reembolso pago aparece nos custos do projeto.

---

---

# JORNADA J9
## Documentos

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

Consultor não tem lugar no sistema para acessar holerites, contrato de trabalho e termos de admissão. Precisa pedir ao RH manualmente para cada documento.

### Objetivo

Consultor acessa `/documentos` e encontra todos os seus documentos em menos de 30 segundos. Somente visualização e download — o DP/Admin faz os uploads.

### Estado Atual

Não existe. Bucket Supabase Storage e tabela `employee_documents` precisam ser criados.

---

### Jobs to be Done

**Funcionais:**
- Acessar meu holerite do mês sem precisar pedir para o RH
- Encontrar meu contrato de trabalho ou termos de admissão quando precisar
- Baixar qualquer documento pessoal em menos de 30 segundos

**Emocionais:**
- Sentir que meus documentos estão seguros e acessíveis quando precisar
- Não sentir dependência do RH para acessar meus próprios documentos

**Social:**
- Responder rapidamente quando o banco ou contador pede um comprovante

---

### Fluxos

**F1 — Página `/documentos`**  
Tabs por categoria:
- **Holerites** — gerados automaticamente via J6 de Pessoas
- **Contratos e Termos** — enviados pelo DP
- **Fiscais** — informe de rendimentos, DIRF
- **Outros**

**F2 — Holerites**  
Cada holerite exibe mês de referência como título principal. Dois botões: "Visualizar" (PDF inline) e "Baixar". Criados automaticamente quando DP processa a folha (J6 de Pessoas).

**F3 — Visualização e Download**  
PDFs abrem em viewer inline ou em nova aba. Download via URL assinada do Supabase Storage (válida por 10 minutos). Para arquivos `.doc`: apenas download.

**F4 — Notificação de Novo Documento**  
Ao disponibilizar: notificação na Caixa de Entrada (J3) com `type: 'document_available'`.

---

### Schema Novo

Bucket: `employee-documents`  
Tabela `employee_documents`: `id`, `tenant_id`, `employee_id`, `category`, `title`, `file_url`, `file_size`, `mime_type`, `reference_month`, `uploaded_by`, `uploaded_at`

---

### Cenários-Limite

- Consultor acessa `/documentos` de outro funcionário via URL — RLS bloqueia?
- URL do Storage expirada — link quebrado tratado graciosamente?
- Nenhum documento disponível — estado vazio orientativo por tab?

---

### Critério de Sucesso

Consultor acessa holerite do mês em menos de 30 segundos. Novo holerite gerado pelo DP aparece com notificação. Nenhum documento de outro funcionário acessível.

---

---

# JORNADA J10
## Perfil do Funcionário

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

Consultor não tem tela de perfil próprio. Para atualizar telefone, PIX ou endereço precisa avisar o RH verbalmente e esperar. Dados desatualizados geram reembolsos para conta errada e correspondências com endereço errado.

### Objetivo

Consultor atualiza dados de contato e pagamento sem acionar o RH. Alterações visíveis imediatamente para o DP.

### Estado Atual

Campos básicos existem no `employees`. Sem página `/meu-perfil`. Sem campos de PIX/banco/endereço (dependem de J2 de Pessoas).

---

### Jobs to be Done

**Funcionais:**
- Atualizar meus dados de contato e pagamento sem precisar acionar o RH
- Manter minha chave PIX e dados bancários atualizados para receber corretamente
- Saber claramente quais dados posso editar e quais precisam de aprovação

**Emocionais:**
- Sentir autonomia para manter meus próprios dados atualizados
- Não ter ansiedade de que meus dados de pagamento estão desatualizados

**Social:**
- Não precisar acionar o RH para coisas simples como trocar o telefone

---

### Fluxos

**F1 — Página `/meu-perfil`**  
Três seções:

*Seção 1 — Identidade (somente leitura com cadeado):*  
Nome, CPF, RG, data de nascimento, email, cargo, tipo de contratação, data de admissão. Tooltip no hover: "Para alterar, entre em contato com o RH."

*Seção 2 — Contato (editável):*  
Telefone (com máscara), CEP (com ViaCEP), logradouro, número, complemento, bairro, cidade, estado.

*Seção 3 — Dados de Pagamento (editável):*  
Tipo de chave PIX + valor, banco (lista de bancos brasileiros), agência, conta, tipo de conta.

**F2 — Foto de Perfil**  
Upload de JPG/PNG máximo 2MB. Bucket `avatars`. Atualiza em navbar, cards de equipe e listagem de funcionários do RH.

**F3 — Edição por Seção**  
Cada seção tem botão "Editar" que habilita os campos. "Salvar" atualiza apenas os campos da seção. Não é possível salvar campos protegidos mesmo se editados por DevTools (RLS no banco).

**F4 — Alteração de Senha**  
Seção "Segurança": botão "Alterar senha" abre dialog com senha atual, nova senha e confirmação. Usa `updatePassword` existente do `AuthContext`.

---

### Cenários-Limite

- Consultor atualiza `salario_mensal` via API direta — RLS bloqueia no banco?
- CEP inválido — campos de endereço ficam em branco com mensagem?
- PIX CPF com dígito verificador inválido — validação rejeita antes de salvar?

---

### Critério de Sucesso

Consultor atualiza endereço e chave PIX em menos de 2 minutos. DP vê os dados atualizados no módulo de RH. Campo de salário inacessível por nenhuma rota.

---

---

# JORNADA J11
## Ponto do Trabalho

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

Nenhum controle de ponto digital existe. Aplica **apenas** para CLT, Estagiário e Menor Aprendiz — conforme lei trabalhista. Sócio e PJ cobertos por contrato.

### Objetivo

Funcionário registra entrada e saída em menos de 3 segundos de qualquer dispositivo. Assina folha mensal eletronicamente — tornando imutável.

### Estado Atual

Não existe. Construção do zero.

---

### Jobs to be Done

**Funcionais:**
- Registrar entrada e saída em menos de 3 segundos de qualquer dispositivo
- Corrigir um registro incorreto antes do fechamento do mês com justificativa
- Assinar a folha de ponto do mês com confirmação eletrônica simples

**Emocionais:**
- Sentir que o ponto é uma formalidade rápida, não uma burocracia complicada
- Não ter ansiedade sobre ter um registro incorreto que não consigo corrigir

**Social:**
- Demonstrar comprometimento com o horário de trabalho de forma objetiva

---

### Fluxos

**F1 — Quem Usa**  
Menu `/ponto` visível apenas para `tipo_contratacao` IN (`CLT`, `ESTAGIO`, `MENOR_APRENDIZ`). Sócio e PJ não veem o menu.

**F2 — Botão de Bater Ponto**  
Botão grande e central. Estados:
- Sem registros hoje: "Registrar Entrada" (verde)
- Após entrada: "Registrar Saída" (laranja) + tempo decorrido
- Após saída: "Jornada encerrada" + total de horas + "Registrar nova entrada" (para intervalos)

Ao clicar: captura `recorded_at: now()`, solicita `navigator.geolocation`, captura IP. Registro imediato (< 1 segundo).

**F3 — Visualização Mensal**  
Tabela do mês com: data, entrada, saída, total, status (✓ / ⚠️ saída pendente / Feriado). Total do mês no rodapé.

**F4 — Edição com Justificativa (até último dia do mês)**  
Clicar em registro editável → dialog com: horário editável + justificativa obrigatória (mínimo 10 caracteres). Ao salvar: `is_manual_edit: true`, `original_recorded_at` preservado, `edit_justification` registrado.

**F5 — Assinatura Mensal**  
Banner a partir do dia 25: "Seu mês se encerra em X dias. Revise e assine sua folha."

Ao assinar:
1. Resumo do mês com todas as entradas/saídas
2. Checklist de pendências (dias sem saída, discrepâncias)
3. Dialog de confirmação: nome completo (deve coincidir exatamente), CPF, checkbox de confirmação
4. Sistema registra: `signed_at`, `signed_name`, `signed_cpf`, `ip_address`, `latitude/longitude`

Após assinar: registros imutáveis. Botões de edição desaparecem.

**F6 — Desbloqueio pelo Admin**  
Admin pode desbloquear folha com justificativa obrigatória. Funcionário notificado. Deve reassinar após a correção.

**F7 — Banco de Horas (apenas CLT)**  
Horas extras (além de `jornada_diaria`): precisam de aprovação do GP ou Admin antes de entrar no banco. Prazo de 6 meses para compensar via folga. No 7º mês sem compensar: vira custo na folha do mês com adicional de 50% (dias úteis) ou 100% (domingos/feriados).

**Estagiário/Menor Aprendiz:** horas extras proibidas por lei. Sistema bloqueia registro que ultrapasse `jornada_diaria` com mensagem: "Este registro excederia a jornada máxima permitida por lei. A realização de horas extras pode descaracterizar o vínculo contratual. Consulte o DP."

---

### Schema Novo

**Tabela `time_records`:**  
`id`, `tenant_id`, `employee_id`, `type` (entry/exit), `recorded_at`, `latitude`, `longitude`, `ip_address`, `device_info`, `is_manual_edit`, `original_recorded_at`, `edit_justification`, `edited_at`, `edited_by`

**Tabela `monthly_timesheet_signatures`:**  
`id`, `tenant_id`, `employee_id`, `reference_month`, `signed_at`, `signed_name`, `signed_cpf`, `ip_address`, `latitude`, `longitude`, `is_admin_unlocked`, `unlocked_at`, `unlock_justification`

---

### Cenários-Limite

- Clique duplo rápido no botão de ponto — debounce evita dois registros?
- Geolocalização negada pelo browser — registro funciona sem geo com flag `latitude: null`?
- Funcionário PJ acessa `/ponto` via URL — página não exibe o módulo?
- Mês já assinado — edição bloqueada mesmo via API (RLS)?

---

### Critério de Sucesso

Funcionário bate entrada e saída em menos de 3 segundos cada. Geolocalização e IP capturados. Edição de registro com justificativa mantém valor original. Assinatura mensal gera registro imutável com todos os campos. Folha de PJ não aparece no menu.

---

---

# JORNADA J12
## PWA do Pulse

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**Transversal — afeta todas as páginas do Meu Espaço**

---

### Contexto e Problema

O Pulse só funciona bem no computador. Bater ponto, lançar horas, ver notificações e solicitar reembolso são ações do dia a dia que o consultor precisa fazer fora do computador. Sem mobile, o compliance cai.

### Objetivo

Consultor instala o Pulse como app no celular e usa o Meu Espaço completo sem precisar do notebook para as ações do dia a dia.

### Estado Atual

`vite-plugin-pwa` não está instalado. Sem `manifest.json`. Sem ícones de app. A `AppSidebar` já tem tratamento mobile via Sheet.

---

### Jobs to be Done

**Funcionais:**
- Usar o Origami Pulse no celular sem precisar do notebook
- Bater ponto, lançar horas e ver notificações em qualquer lugar
- Instalar o app uma vez e acessar como qualquer outro app do celular

**Emocionais:**
- Sentir que o sistema acompanha minha rotina, não me prende à mesa
- Não sentir que o Pulse é mais uma ferramenta que só funciona no computador

**Social:**
- Mostrar para colegas que a empresa usa ferramentas modernas e acessíveis

---

### Fluxos

**F1 — Setup Técnico**  
```bash
npm install -D vite-plugin-pwa
```
Configurar em `vite.config.ts`:
- `registerType: 'autoUpdate'`
- `host: true` (acesso via IP local já configurado)
- Manifest: `display: 'standalone'`, `orientation: 'portrait'`, `start_url: '/dashboard'`
- Workbox: NetworkFirst para chamadas ao Supabase

**F2 — Ícones Necessários**  
Criar na pasta `public/`:
- `icon-192.png` — 192×192px baseado no logo
- `icon-512.png` — 512×512px (versão maskable para Android com 20% de padding)
- `apple-touch-icon.png` — 180×180px para iOS

Adicionar no `index.html`:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**F3 — Prompt de Instalação**  
Componente `InstallPWABanner` no topo do dashboard:
- Android/Chrome: evento `beforeinstallprompt` → botão "Instalar"
- iOS Safari: instruções de "Compartilhar → Adicionar à Tela de Início"
- Aparece uma vez por sessão. Ao dispensar: não reaparece por 7 dias

**F4 — Layouts Mobile por Funcionalidade**

*Ponto (/ponto):* botão 80px de altura, ocupa 90% da largura, texto grande. Tabela mensal como lista vertical.

*Timesheet:* um projeto por vez com os 5 dias da semana abaixo. Campos de hora grandes para toque.

*Meu Kanban:* uma coluna por vez com swipe horizontal entre A Fazer / Fazendo / Feito. Cards em tela cheia.

*Reembolsos:* câmera integrada via `input[capture=environment]`.

*Documentos:* lista vertical simples com botões grandes.

**F5 — Escopo PWA = Meu Espaço apenas**  
Quando rodando em modo standalone (`window.matchMedia('(display-mode: standalone)')`): menu de navegação exibe apenas opções do Meu Espaço. Módulos de GP e Admin acessíveis apenas pelo browser desktop.

**F6 — Comportamento Offline**  
Cache NetworkFirst para dados do Supabase. Quando offline: dados já carregados ficam visíveis. Ações que modificam dados exibem: "Sem conexão. Reconecte para salvar." Sem fila de sincronização offline — o consultor precisa de conexão para bater ponto.

---

### Cenários-Limite

- Instalar no iOS Safari → fechar app → sessão Supabase persiste?
- Rotação de tela para paisagem → layout não quebra?
- Update disponível → `autoUpdate` aplica silenciosamente sem perder a sessão?
- Conexão cai durante registro de ponto → mensagem clara sem dados perdidos?

---

### Critério de Sucesso

PWA instalado no Android e iOS. Consultor bate ponto com geolocalização no celular. Foto de recibo tirada pela câmera. Timesheet confirmado sem abrir notebook. Módulos de GP e Admin inacessíveis via menu do PWA.

---

---

## Resumo de Prioridades

| # | Jornada | Impacto | Sprint |
|---|---|---|---|
| J1 | Convite e Primeiro Acesso | Alta | Sprint 1 |
| J2 | Onboarding | Média | Sprint 1 |
| J3 | Caixa de Entrada | Alta | Sprint 1 |
| J6 | Navegação e Execução no Projeto | Alta | Sprint 2 |
| J5 | Meus Projetos | Alta | Sprint 2 |
| J4 | Meu Kanban | Alta | Sprint 2–3 |
| J7 | Timesheet (pré-preenchimento) | Alta | Sprint 2–3 |
| J8 | Reembolso (UX e linha de status) | Média | Sprint 3 |
| J11 | Ponto do Trabalho | Alta | Sprint 3–4 |
| J9 | Documentos | Média | Sprint 4 |
| J10 | Perfil do Funcionário | Média | Sprint 4 |
| J12 | PWA | Alta | Sprint 4 |

---

## Dependências

| Dependência | Impacto |
|---|---|
| **GP Projetos J6 antes de J4 e J6** | Board de atividades deve existir para Meu Kanban e Navegação no Projeto |
| **GP Projetos J2 antes de J4** | Mapeamento de colunas configurado pelo GP para Meu Kanban funcionar |
| **Pessoas J6 antes de J9** | Holerites gerados pelo DP aparecem na página de Documentos |
| **J1 antes de J2** | Onboarding só faz sentido após o primeiro acesso funcionar |
| **J3 implementada** | Notificações de J7 (timesheet reminder), J8 (reembolso) e J9 (documento) dependem da Caixa de Entrada |
| **J11 coordenado com Pessoas** | DP precisa da visão de ponto do funcionário no perfil do módulo de Pessoas |

---

*Documento gerado para o Hackathon Origami Pulse — 04/06/2026*  
*Equipe Masu 📦 — Funcionário / Consultor*
