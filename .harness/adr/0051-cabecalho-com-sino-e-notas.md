# ADR 0051: Cabeçalho com sino de notificações e notas compartilháveis

- Status: aceito
- Data: 2026-10-21
- Decisores: Italo Castro (tech lead)
- Relacionados: projete-app (Topbar com `SinoDeNotificacoes` e `NotasDoHeader`, origem do
  desenho), ADR-0021 (tenant de `auth.uid()`), ADR-0027 (capacidade), ADR-0046 (RLS sem custo
  por linha), ADR-0048 (novidades do produto)

## Contexto

"Deveríamos ter um header no sistema, que nele teremos as notificações e tal, igual o
Projete. Podemos ter a parte de anotações também." No desktop não havia cabeçalho: só o
celular tinha uma barra com o botão do menu. Notificação aparecia no card do Dashboard e na
página `/inbox`, fora do menu; o `InboxButton` existia, mas não estava montado em lugar nenhum
desde que a barra antiga saiu. Escolhas do Italo: no cabeçalho, sino e notas (sem o
cronômetro do Projete, por ora); notas pessoais e compartilháveis, com pessoas escolhidas ou
com a empresa inteira, e com anexos.

## Decisão

1. **Um cabeçalho para desktop e celular** (`AppHeader`), no lugar da barra só do celular. À
   direita, o sino e as notas, em qualquer tela; no celular, o botão do menu continua à
   esquerda. O `InboxButton` órfão saiu, e o tempo real das notificações foi para
   `useNotificationsRealtime`, usado pelo sino.
2. **Sino.** Contador de não lidas e painel com as não lidas (até 8), sobre os hooks que a Caixa
   de Entrada já usa. Abrir marca como lida e leva ao `action_url`. "Marcar todas como lidas" e
   "Abrir Caixa de Entrada". Nada novo no banco.
3. **Notas** (`notes`, `note_shares`, `note_attachments`, bucket privado `note-attachments`):
   - título (até 200) e texto simples (até 50 mil), fixar, busca. Texto formatado ficou de
     fora: exigiria biblioteca nova de editor, e o boundary pede decisão própria para isso;
   - compartilhar com pessoas da mesma empresa ou abrir para a empresa inteira. **Só quem
     escreveu edita, compartilha, anexa e apaga**; quem recebe lê;
   - compartilhar com uma pessoa avisa no sino (categoria `nota`, `action_url`
     `/dashboard?nota=<id>`, que abre o painel direto na nota). Abrir para a empresa não avisa
     ninguém, para não virar ruído;
   - anexos de até 10 MB, tipos comuns (PDF, imagem, texto, Office, ZIP), também limitados no
     bucket. O arquivo segue a mesma regra de leitura da nota.
4. **Acesso.** Capacidade `nota:usar`, dada a todos os perfis (espelha
   `timesheet-proprio:apontar`): nota é ferramenta pessoal, como o timesheet, e desligar para
   um perfil é toggle. Leitura em forma de conjunto (ADR-0046): `id IN
   (readable_note_ids())`, com tenant e pessoa vindos de `auth.uid()`. Escrita por
   `is_note_author()`. Guardas no banco: autor e empresa não mudam; compartilhar só com alguém
   da mesma empresa e nunca com o próprio autor; anexo só na pasta `{tenant}/{nota}/` da nota.
   O caminho do bucket é lido por `note_id_from_path()`, que devolve nulo em vez de falhar o
   cast para objeto de outro bucket.

## Consequências

- Benefícios: o aviso chega a quem está trabalhando, em qualquer tela; anotação deixa de
  morar fora do sistema e pode ser dividida com a equipe sem virar e-mail.
- Custos: três tabelas, um bucket e uma barra de 48 px no topo de todas as telas.
- Riscos: nota compartilhada com a empresa expõe o conteúdo a todo mundo do tenant; o editor
  diz isso, e só o autor pode abrir. Apagar a nota tira os arquivos do bucket antes (a linha
  some em cascata, o objeto não).
- Como reverter: tirar `AppHeader` do `AppLayout` volta ao layout anterior;
  `supabase/rollback/20261021170000_notes_rollback.sql` remove tabelas, funções, policies e a
  capacidade (o bucket precisa ser esvaziado pelo painel antes).

## Evidências

- Ensaio local da migration com stub, incluindo `storage.objects` com RLS: quem não recebeu
  não lê; quem recebeu lê, mas não edita, não compartilha e não sobe arquivo; abrir para a
  empresa libera colegas e nunca outro tenant nem quem não tem `nota:usar`; compartilhar com
  outra empresa, consigo ou anexar fora da pasta é recusado (PU001); a notificação nasce com o
  caminho da nota; rollback e reaplicação.
- Prints (Playwright, Chromium) do sino aberto, da lista, do editor e da leitura de nota
  alheia, em claro, escuro e 390 px, com dados de exemplo.
- Código: `src/components/layout/AppHeader.tsx`, `src/components/notifications/`,
  `src/components/notes/`, `src/services/noteService.ts`, `src/lib/notes.ts`.
