# ADR 0047: E-mail salvo no projeto é cópia, identificada pelo Message-ID

- Status: aceito
- Data: 2026-10-21
- Decisores: Italo Castro (tech lead)
- Relacionados: ADR-0011 (identidade entre caixas pelo iCalUId), ADR-0019 (OneDrive é o
  dono dos arquivos do projeto), ADR-0021 (tenant derivado de `auth.uid()`), ADR-0027
  (capacidade + escopo), ADR-0046 (RLS sem custo por linha)

## Contexto

Decisões de projeto chegam por e-mail ("o cliente aprovou o escopo da fase 2 sem a
integração com o ERP") e ficam na caixa de uma ou duas pessoas. Quando alguém pergunta
"quem decidiu isso?", a resposta depende de quem lembra e de quem ainda tem a mensagem.
O pedido foi marcar o e-mail na aba E-mails do Pulse e salvá-lo no projeto, e liberar a
aba E-mails, que estava só em ambiente local, para todo mundo.

A integração com o Microsoft Graph usa escopo delegado (`Mail.Read`) e alcança só `/me`.
O `id` de uma mensagem no Graph é **por caixa de correio**: o mesmo e-mail tem id
diferente para cada destinatário, e ninguém lê a caixa de outra pessoa.

Perguntas respondidas pelo tech lead em 21/10/2026: aba própria "E-mails" no projeto;
cópia completa com resumo opcional; a equipe do projeto salva e todos do projeto leem;
anexos vão para a pasta do projeto no OneDrive.

## Decisão

1. **Cópia, não referência.** O Pulse guarda assunto, remetente, destinatários, data e
   corpo em `project_emails`. Guardar só o id faria o registro existir para quem salvou e
   para mais ninguém. O corpo é renderizado no mesmo iframe isolado da caixa de entrada
   (`MessageBody`: sandbox sem script e sem mesma origem, CSP `default-src 'none'`); as
   imagens embutidas viajam como data URI e saem do corpo salvo só acima de 4 milhões de
   caracteres (`bodyForStorage`).
2. **Identidade pelo `internetMessageId`** (Message-ID do RFC 5322), igual em todas as
   caixas, pelo mesmo motivo do iCalUId no ADR-0011. Único por projeto: o mesmo e-mail não
   entra duas vezes no mesmo projeto, mas pode estar em vários (decisão que afeta dois
   projetos). A caixa de entrada mostra "Salvo em" com os projetos onde ele já está.
3. **Cópia imutável, resumo editável.** O trigger `project_emails_guard` recusa UPDATE
   em qualquer coluna da cópia (PU001). Corrigir é remover e salvar de novo: o registro
   não muda sem deixar claro que mudou. O resumo ("o que foi decidido") é opcional, por
   decisão do negócio.
4. **Anexos no OneDrive, índice no Pulse.** Com a pasta do projeto vinculada, os anexos
   vão para `E-mails/<aaaa-mm-dd> <assunto>/`, com o token de quem salva. O Pulse guarda
   nome, tamanho e link em `project_emails.attachments`. Quem abre o arquivo é decidido
   pelo compartilhamento do OneDrive (ADR-0019). Falha em um anexo não impede salvar o
   e-mail, e a pessoa vê quais faltaram. Remover o e-mail do projeto não apaga arquivos.
5. **Acesso: capacidade + relação com o projeto** (ADR-0027, item 7).
   - `email-projeto:ler`: quem tem a capacidade e alcança o projeto (portfólio, quem gere
     qualquer projeto, o GP, ou alocado).
   - `email-projeto:salvar`: quem tem a capacidade e **faz parte** do projeto (GP, quem
     gere qualquer projeto, ou alocado). Ver o portfólio não basta para salvar.
   - Editar resumo e remover: quem salvou, ou quem gere o projeto.
   - `saved_by` é sempre a própria pessoa (policy de INSERT).
   - As duas capacidades nascem espelhando `arquivo-projeto:ler` (Admin, Gerente,
     Colaborador): e-mail salvo é documento do projeto como os outros.
6. **Leitura em forma de conjunto** (ADR-0046). A policy de SELECT é
   `project_id IN (SELECT email_readable_project_ids())`: o plano mostra *hashed SubPlan*,
   avaliado uma vez por consulta. A lista do projeto não traz o corpo; ele é lido só ao
   abrir o e-mail. O seletor de projetos (`projects_for_email_save`) usa o mesmo predicado
   da policy de INSERT, em conjunto e com o tenant de `auth.uid()`.

## Consequências

- Benefícios: a decisão fica no projeto, legível pela equipe toda, e sobrevive à saída de
  quem recebeu o e-mail. A busca da aba acha por assunto, resumo e remetente.
- Custos: conteúdo de e-mail passa a morar no Postgres, inclusive nomes e endereços de
  pessoas de fora da empresa (LGPD). A exposição é a mesma de qualquer documento do
  projeto, e a pessoa vê, antes de salvar, que a equipe toda vai ler.
- Riscos: salvar e-mail com conteúdo que não deveria circular na equipe. Mitigação: o
  diálogo diz quem vai ler; quem salvou ou o GP removem. A cópia não acompanha a mensagem
  original: se o remetente corrigir por outro e-mail, é outra mensagem a salvar.
- Como reverter: `supabase/rollback/20261021120000_project_emails_rollback.sql` apaga a
  tabela, as funções e as capacidades. Os anexos ficam no OneDrive.

## Alternativas consideradas

- **Guardar só a referência (id ou webLink)** — recusada: só abre para quem salvou.
- **Exportar `.eml` para o OneDrive** — recusada: o arquivo fica fora do Pulse, sem resumo,
  sem busca e sem "Salvo em" na caixa de entrada.
- **Anexos em bucket do Supabase** — recusada: o projeto já tem pasta no OneDrive, e
  duplicar o lugar do arquivo é o que o ADR-0019 evitou.
- **Resumo obrigatório** — recusada pelo negócio. Exigir texto produz frase de preencher
  campo, e o ADR-0011 já registrou por que dado inventado é pior que dado ausente.

## Evidências

- Migration `supabase/migrations/20261021120000_project_emails.sql`, aplicada num Postgres
  local com stub do schema em 21/10/2026, junto com o rollback e a reaplicação. Ensaio por
  perfil: colaborador alocado salva só no projeto dele e não assina por outra pessoa;
  colaborador de fora não lê nem edita; gerente lê o tenant e salva só onde é GP; admin
  salva em qualquer projeto; outro tenant não lê nem grava; corpo imutável (PU001); mesmo
  e-mail no mesmo projeto recusado (23505); GP remove o e-mail salvo por outra pessoa.
- Aplicada em produção em 21/10/2026, antes do deploy do front, por pedido do tech lead
  (`supabase db push`). Conferido como usuário autenticado, em transação desfeita: as
  capacidades novas foram para os mesmos 9 perfis que têm `arquivo-projeto:ler`, e
  `projects_for_email_save()` devolveu os projetos em andamento de quem chamou.
- Front: `src/hooks/useProjectEmails.ts`, `src/services/projectEmailService.ts`,
  `src/lib/projectEmail.ts`, `src/components/email/SaveEmailToProjectDialog.tsx`,
  `src/components/projects/detail/ProjectEmailsTab.tsx`.
