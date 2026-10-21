# ADR 0050: Meu Kanban configurável por pessoa e lembrete de compromisso

- Status: proposto
- Data: 2026-10-21
- Decisores: Italo Castro
- Relacionados: ADR-0004 e ADR-0043 (PWA e cache offline), ADR-0021 (RPC definer), ADR-0027
  (capacidade), ADR-0046 (RLS sem custo por linha), jornada J4 de `jornadas/funcionario.md`

## Contexto

O Meu Kanban nasceu com três colunas fixas em inglês ("To do / Doing / Done"), sem nenhuma
tela para configurá-las — os hooks de criar/renomear/excluir coluna existiam sem uso. Os
cards de projeto e o widget do dashboard reconheciam a etapa pelo **nome** da coluna:
renomear "Doing" bastaria para os cards de projeto sumirem. O prazo do card era só um dia,
sem hora, e não havia lembrete — a pessoa que marcava um compromisso precisava lembrar
sozinha. Em produção, 21 pessoas abriram o board e só 2 criaram card.

Pedido: redesenhar, permitir que cada pessoa configure o próprio kanban a partir de uma base
comum, e lembrar do compromisso por Inbox, e-mail e push no navegador/celular, com data e hora.

Alternativas descartadas:
- **Modelo de colunas por empresa (admin)**: exige tela de admin e capacidade nova para algo
  que é pessoal. A base do sistema basta; o tenant pode ganhar modelo depois, se pedir.
- **Lembrete só por dia (cron diário)**: não serve para reunião.
- **Push pelo `src/sw.ts`**: esse worker faz cache offline e só é registrado no celular
  (ADR-0004/0043). Registrá-lo no desktop ligaria o cache para todos.
- **Calcular `remind_at` no banco com fuso fixo (America/Sao_Paulo)**: erra para quem marca
  de outro fuso. O navegador sabe o fuso de quem marcou; o banco não guarda fuso de pessoa
  nem de tenant.

## Decisão

1. **Etapa por coluna.** `personal_kanban_columns.stage` (`todo` / `doing` / `done`) e
   `color` (chave de token do tema, nunca hex). O nome fica livre. Card de projeto entra na
   **primeira coluna** (por posição) da etapa correspondente. A última coluna de cada etapa
   não pode ser removida nem trocar de etapa — sem ela os cards de projeto daquela etapa
   ficariam sem lugar. Coluna com cards não é removida (a FK apagaria os cards em cascata).
2. **Base do sistema nos DEFAULTs do banco.** Colunas A fazer / Fazendo / Feito;
   `personal_kanban_settings` com lembrete padrão de 15 min, arquivar o Feito após 14 dias e
   e-mail ligado. O front lê a linha e não repete os valores. As 63 colunas existentes ganham
   os nomes em português pela `20261021161500`, separada de propósito: ela só roda no build da
   Vercel, junto com o front novo, porque o front antigo acha as colunas pelo nome e renomear
   antes tiraria os cards de projeto da tela de todo mundo.
3. **Hora e lembrete no card.** `due_date` segue sendo o dia; `due_time` é a hora local,
   opcional. `reminder_minutes` é a antecedência; `remind_at` é o instante, calculado no
   navegador. Card sem hora é lembrado às 9h do dia (ou da véspera). Remarcar o lembrete
   (`remind_at` mudou) zera `reminder_sent_at` por trigger: compromisso adiado volta a ser
   lembrado. Card numa coluna de etapa "feito" ou arquivado não é lembrado.
4. **Três canais, independentes.** Inbox sempre (categoria `lembrete`, abre o card); e-mail
   via Resend, com opção de desligar; push por aparelho, que a pessoa ativa (o navegador pede
   permissão). Falha de um canal não impede os outros.
5. **Push com service worker próprio** (`public/push-sw.js`, escopo `/push/`). Não disputa o
   escopo `/` com o worker de cache, então o push funciona no desktop sem ligar o cache
   offline. A janela aberta não é controlada por ele: o clique na notificação manda
   `PULSE_NAVIGATE` e o app navega pelo router. Inscrições em `push_subscriptions` (genérica,
   uma linha por pessoa e navegador); 404/410 do serviço de push apaga a inscrição.
6. **Cron por minuto, com guarda.** O job chama a Edge Function
   `notify-personal-kanban-reminders` só quando `has_due_personal_kanban_reminders()` é
   verdadeiro. A função reserva os cards com `claim_due_personal_kanban_reminders()`
   (`FOR UPDATE SKIP LOCKED`, marca `reminder_sent_at` na mesma instrução): entrega **no
   máximo uma vez**. Lembrete vencido há mais de 6 h não é mandado.
7. **Limpeza do Feito.** `completed_at` é marcado por trigger quando o card entra numa coluna
   de etapa "feito" (ou quando a coluna passa a ser "feito"). Job diário em SQL
   (`archive_done_personal_kanban_cards`) preenche `archived_at` depois de N dias; 0 = nunca.
   Arquivado sai do board e pode ser restaurado.
8. **Acesso.** É dado do próprio funcionário: RLS por `(employee_id, tenant_id)` do login nas
   tabelas novas, sem capacidade (ADR-0027 não se aplica a dado pessoal, como no fomento
   público). As funções do cron são revogadas de `anon`/`authenticated`; a Edge Function roda
   com service role, só pelo cron (`ehChamadaDeServico`), e grava cada notificação no tenant
   da própria linha.

## Consequências

- Benefícios: kanban com cara de ferramenta pessoal (colunas, cores, limpeza); cards de
  projeto deixam de depender do nome da coluna; compromisso com hora é lembrado onde a pessoa
  estiver.
- Custos: três segredos novos na Edge Function e uma variável no front; um job por minuto
  (consulta indexada barata; invocação só quando há lembrete).
- Riscos:
  - Entrega no máximo uma vez: se o envio falhar depois da reserva, o lembrete se perde. O
    Inbox é gravado em lote e é o canal mais confiável.
  - Cron parado por mais de 6 h perde os lembretes dessa janela.
  - iOS só entrega push com o app instalado na tela inicial (Safari 16.4+).
  - `remind_at` reflete o fuso do navegador de quem salvou; quem viajar e reeditar o card
    recalcula no fuso novo.
- Como reverter: `supabase/rollback/20261021135000_meu_kanban_lembretes_e_configuracao_rollback.sql`
  (remove jobs, funções, tabelas e colunas novas), antes dela
  `supabase/rollback/20261021161500_meu_kanban_colunas_em_portugues_rollback.sql` (devolve os
  nomes em inglês às colunas que ainda batem com a etapa), apagar a Edge Function e voltar o front.

### Pré-requisitos manuais (uma vez por projeto, fora do código por conter credencial)

1. Gerar as chaves: `npx web-push generate-vapid-keys`.
2. Segredos da Edge Function:
   `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=https://origamipulse.com.br APP_URL=https://origamipulse.com.br`
   (o subject aceita `mailto:` ou URL https; usamos a URL para não expor e-mail pessoal aos serviços de push).
   Sem VAPID o push é pulado (contado em `pushSkipped`) e os outros canais seguem.
3. Front (Vercel): `VITE_VAPID_PUBLIC_KEY` com a mesma chave pública.
4. Os segredos do cron no Vault (`app_supabase_url`, `app_service_role_key`) já existem
   (20260831120000).

## Adendo (21/10/2026): vínculo com projeto

Pedido do Italo: vincular card pessoal a um projeto e filtrar o kanban por projeto. Decisões
dele, na sessão: o card vinculado **vira atividade do projeto**; **qualquer projeto que a
pessoa enxerga** pode receber o card; os dois **ficam ligados** (o pessoal guarda prazo,
lembrete e tags, que a atividade não tem); e **arrastar no Meu Kanban move a atividade**.

1. **Vínculo.** `personal_kanban_cards.project_activity_card_id` → `project_activity_cards`
   (`ON DELETE SET NULL`; único por pessoa e atividade; o trigger do card recusa atividade de
   outro tenant). Vincular cria a atividade pelo `useCreateActivity` do board (mesmo checklist
   de modelo), tipo Tarefa, atribuída a quem vinculou, na coluna da etapa atual (A fazer →
   Product Backlog, Fazendo → In Dev, Feito → Done). A descrição vira a user story inicial e
   não é sincronizada depois. "Acompanhar no meu kanban", numa atividade já atribuída, cria o
   card pessoal vinculado. Desvincular mantém a atividade no projeto.
2. **Quem pode vincular: diverge do board, por decisão.** No board, só equipe/gerente cria card
   (`useActivityPermissions.canCreateCard`). Aqui vale qualquer projeto visível pela RLS de
   `projects` (status planning/active/paused). A policy de `project_activity_cards` em produção é
   do tenant inteiro (conferido em 21/10/2026: 4 policies `tenant_id = get_user_tenant_id`), então
   o banco aceita. Consequência aceita: dá para pôr atividade em projeto de que a pessoa não
   participa.
3. **Sincronia.** Meu Kanban → projeto: o front grava na atividade (título ao salvar; coluna ao
   mover, atividade primeiro e card depois, com rollback se o projeto recusar). Projeto →
   Meu Kanban: trigger `sync_personal_cards_from_activity` (SECURITY DEFINER, `search_path` vazio,
   execute revogado). Quem move a atividade no board (GP, colega, MCP, fechamento de sprint) não
   alcança o card pessoal alheio pela RLS; o trigger escreve só nos cards vinculados àquela
   atividade e no tenant dela. Título do projeto vale para o card; mudança de etapa leva o card
   para a primeira coluna da etapa no kanban do dono; mudança dentro da etapa não mexe.
4. **Regras do board aplicadas no Meu Kanban** (`src/lib/personalKanbanActivity.ts`), as mesmas
   que o board aplica só na tela: atividade concluída só reabre para In Deploy; bloqueada não
   avança; Done com checklist de Done incompleto pede confirmação (sem item conta como completo);
   voltar para "a fazer" vai para Sprint Backlog se a atividade tem sprint, senão Product Backlog.
   **Não aplicado:** limite de WIP (o board só aplica no drag & drop e o padrão vive dentro do
   componente) e a regra de coluna vizinha (as etapas do Meu Kanban agrupam colunas).
5. **Filtro por projeto** na barra do board: Todos, Sem projeto e cada projeto presente (cards
   vinculados e atividades atribuídas). A atividade vinculada aparece uma vez só, pelo card pessoal.

Migration: `supabase/migrations/20261021137000_meu_kanban_vinculo_com_projeto.sql`, versão abaixo
de 20261021140000 para poder ser aplicada à mão antes do deploy. Rollback:
`supabase/rollback/20261021137000_meu_kanban_vinculo_com_projeto_rollback.sql`.

## Evidências

- Migrations: `supabase/migrations/20261021135000_meu_kanban_lembretes_e_configuracao.sql`
  (aplicada à mão em 21/10/2026 e registrada com `migration repair`) e
  `supabase/migrations/20261021161500_meu_kanban_colunas_em_portugues.sql` (entra no deploy)
- Edge Function: `supabase/functions/notify-personal-kanban-reminders/index.ts`
- Service worker de push: `public/push-sw.js`
- Uso em produção antes da mudança (21/10/2026): 21 boards, 63 colunas com os nomes do
  padrão, 2 pessoas com card.
- Ensaio da migration em Postgres descartável (21/10/2026): aplica, triggers, reserva sem
  duplicar, arquivamento, RLS por pessoa e tenant, rollback e reaplicação.
