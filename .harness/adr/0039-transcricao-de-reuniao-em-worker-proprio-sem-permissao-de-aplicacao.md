# ADR-0039 — Transcrição de reunião roda em worker próprio, sem permissão de aplicação

- **Data:** 24/09/2026
- **Status:** proposta
- **Decisores:** Italo Castro
- **Relacionadas:** [ADR-0011](0011-project-ritos-calendar-link.md) (identidade da reunião por `iCalUId`), [ADR-0016](0016-microsoft-sso-via-edge-function.md) (token delegado MSAL), [ADR-0019](0019-arquivos-de-projeto-e-integracao-onedrive.md) (OneDrive e a recusa de permissão de aplicação), [ADR-0027](0027-capacidade-derivada-de-papel.md) (capacidade nasce com a feature)

## Contexto

Reunião de projeto vira conhecimento que morre na memória de quem participou. O que
sobra é ata escrita à mão, quando sobra. A pergunta que abriu esta decisão foi direta:
a pessoa entra na call, grava, e ao terminar o texto aparece no projeto.

O mercado resolve isso com serviço por assinatura — o Fireflies cobra por usuário, todo
mês, e a gravação do cliente passa a viver na infraestrutura dele. Os dois custos pesam:
o recorrente por cabeça e o fato de a conversa com o cliente sair da empresa. O WhisperX
faz transcrição com timestamp por palavra e separação de vozes rodando na nossa máquina.

Três peças já existem no Pulse e encaixam:

- Token delegado MSAL, com `Files.ReadWrite.All` pedido de forma incremental, só no uso
  (`FILES_SCOPES`, `src/services/microsoftGraphService.ts`).
- `project_ritos` liga o `ical_uid` de uma série de calendário ao projeto
  (`supabase/migrations/20260805220000_project_ritos.sql`, ADR-0011). **O Pulse já sabe
  de qual projeto é a reunião, antes de ela acontecer.**
- `market_analysis_jobs` já estabelece o formato de trabalho assíncrono aqui: tabela de
  job com status, Edge Function para enfileirar e outra para consultar.

A peça que falta não é API da Microsoft: é um lugar onde código Python pesado roda. Edge
Function do Supabase é isolate Deno — sem Python, sem PyTorch, com memória e tempo de
parede curtos. O modelo sozinho passa de alguns GB e uma hora de áudio consome minutos de
CPU. Não é limitação de plano; é runtime errado.

## Decisão

### O processamento roda em VM própria, fora do Supabase

Esta é a primeira peça de backend do Pulse fora do Supabase. O Postgres continua sendo
onde o estado mora; a VM é só músculo.

### A VM puxa da fila. Não expõe API

O job é uma linha em tabela nossa, com `tenant_id` e RLS, no molde de
`market_analysis_jobs`. A VM consulta a fila e busca trabalho; nada é chamado de fora
para dentro.

Expor uma API na VM exigiria domínio, TLS, autenticação, firewall e CORS — superfície
pública nova para ganhar segundos de latência num processo que leva minutos. E com fila,
VM fora do ar significa trabalho esperando; com API síncrona, significa erro na cara da
pessoa.

### O worker nunca recebe credencial do Microsoft Graph

Este é o ponto que a decisão existe para proteger. Com token delegado, quem alcança o
arquivo é a pessoa. Um worker buscando a gravação sozinho precisaria de *application
permission* — acesso a todos os arquivos do tenant. O ADR-0019 já recusou isso, e um
processo automático é precisamente o caso que aquela recusa tinha em vista.

A saída usa o que já está implementado: `getDriveDownloadUrl`
(`src/services/microsoftGraphService.ts`) devolve a anotação
`@microsoft.graph.downloadUrl`, pré-autenticada e de validade curta. O navegador da
pessoa — que já tem o token dela — resolve essa URL e a grava no job. A VM baixa direto
da Microsoft sem credencial nenhuma, e o link expira sozinho.

Duas consequências que andam junto com isso:

- **A URL é segredo temporário.** Não vai para log, em lado nenhum
  (`.harness/patterns/logging.md`).
- **Job que estoura a validade da URL não se conserta sozinho.** Ele volta para a pessoa
  reenfileirar, porque só ela pode gerar outra.

### A reunião nasce no projeto e já nasce gravando

O caminho feliz é a reunião ser criada de dentro do projeto, no Pulse, com gravação
automática ligada. Ninguém aperta nada durante a call. O projeto de destino sai do
vínculo estrutural, não de inferência.

**Transcrição não é arquivada em projeto escolhido por adivinhação.** Classificar pelo
conteúdo da conversa — alguém falando o nome do projeto em voz alta — colocaria ata com
valor e margem de um cliente dentro do projeto de outro. Para reunião que não nasceu no
Pulse, o sistema **sugere e a pessoa confirma**; palpite confirmado é seguro, palpite
executado sozinho não é.

### A saída vai para os dois lugares

Texto em tabela, com `tenant_id`, RLS e capacidade própria (ADR-0027), porque transcrição
é dado e precisa ser pesquisável. Arquivo na pasta do projeto no OneDrive, porque é lá que
os documentos do projeto moram (ADR-0019).

**Quem publica o arquivo é o cliente, não o worker** — pela mesma razão do download. O
worker não tem credencial do Graph e não vai ganhar uma; o texto que ele devolve para no
Postgres. A cópia na pasta do projeto é subida pelo navegador de quem tem o token delegado,
no primeiro acesso à transcrição concluída. O custo é aceitar que transcrição que ninguém
abriu ainda não tem arquivo no OneDrive: o registro, que é o que importa, já está no banco.

### Escopo novo entra incremental

Ligar gravação automática exige `OnlineMeetings.ReadWrite`, que hoje não temos. Ele **não
pode entrar em `GRAPH_SCOPES`**: aquele conjunto é usado em toda aquisição silenciosa, e
somar escopo ali faria a agenda parar para quem não tiver o consentimento. Vai pelo
caminho do seletor de arquivos — pedido no momento do uso, falha contida.

## Consequências

**Ganhos**

- Custo por usuário desaparece. A gravação e o áudio não saem da empresa; o que sai do
  nosso controle é só uma URL de validade curta, e para a nossa própria VM.
- Nenhuma permissão nova no Graph do lado dos arquivos. O modelo delegado do ADR-0019
  sobrevive intacto a um componente automático — que era o teste difícil dele.
- A transcrição sobrevive à gravação. O Teams apaga gravação por política de expiração;
  o texto no nosso lado vira o registro que resta da reunião.
- O projeto de destino é fato, não inferência.

**Custos e riscos**

- **Uma peça de infraestrutura para operar.** Deploy, modelo, disco, atualização. O Pulse
  nunca teve isso. VM parada significa fila crescendo em silêncio — precisa de alerta
  (`.harness/patterns/monitoring.md`), senão o sintoma é "a transcrição nunca chega".
- **Superfície nova de dado sensível.** Reunião com cliente carrega valor, margem, às
  vezes salário. Passa a existir uma cópia em texto, pesquisável. A capacidade que
  governa a leitura é parte da entrega, não item posterior.
- **A separação de vozes vem sem nome.** O WhisperX entrega "Speaker 1", "Speaker 2".
  Ligar voz a pessoa depende da lista de participantes do evento — e erra. Transcrição
  errada tem aparência de registro oficial, o que é pior que não ter registro.
- **O modelo de diarização é *gated*.** O pyannote exige aceite de termos numa conta
  Hugging Face; o token fica na VM, nunca no repositório.
- **Sem gravação automática, o fluxo inteiro depende de alguém lembrar de gravar.** É o
  maior risco de adoção, e ele é de política do tenant, não de engenharia.

## Alternativas descartadas

**Serviço de transcrição por assinatura (Fireflies e similares).** Custo recorrente por
usuário e a gravação do cliente hospedada fora. É exatamente o que esta decisão evita.

**Transcrição nativa do Teams.** É mais barata — não processa nada — e sabe o nome real
de quem falou, porque conhece os participantes. Foi descartada como caminho principal por
depender de licença e política de transcrição do tenant, e por não cobrir áudio de outra
origem. Continua sendo o atalho óbvio quando o `.vtt` existir ao lado da gravação; se a
transcrição nativa for liberada para todos, esta decisão merece revisão.

**Bot entrando na chamada para gravar.** É como os serviços de mercado fazem. Exige bot de
mídia registrado e permissão de aplicação — o que o ADR-0019 recusa — e infraestrutura
desproporcional ao ganho.

**Rodar no Supabase.** Edge Function não executa Python nem carrega modelo de vários GB.
Não havia decisão a tomar aqui, só uma restrição a constatar.

**VM expondo API chamada pelo Pulse.** Descartada pela superfície pública e pelo
comportamento em falha, descritos acima.

## Verificação pendente

Nada foi exercitado contra o Graph real. Antes de qualquer código:

1. **Gravação automática está liberada na política do M365 do tenant?** Se não estiver,
   o desenho inteiro perde o automatismo e vira botão manual.
2. **Onde cai a gravação iniciada automaticamente — no OneDrive do organizador?** Quando
   alguém clica em gravar, o arquivo vai para o drive de quem clicou. Se a automática
   ficar com o organizador, e a reunião nasceu no Pulse, o arquivo está no drive de quem
   está logado — e a busca não precisa lidar com compartilhamento. Se ficar com outra
   pessoa, a varredura cai nos quirks de `sharedWithMe` já mapeados em
   `.harness/integrations/onedrive.md`.
3. **`recordAutomatically` é atingível pelo caminho delegado?** A propriedade vive no
   recurso `onlineMeeting`, não no evento; confirmar o passo e o escopo na documentação.
4. **Specs da VM** — GPU, vCPU, RAM e onde ela está. Não muda a decisão; muda o que a
   tela promete: com GPU, minutos; só em CPU, pode passar de meia hora por reunião.
5. **Bloqueio herdado:** o consentimento de admin para `Files.ReadWrite.All` continua
   sem ser dado. Nada da integração de arquivos funciona sem ele.

## Critério de revisão

- Se a transcrição nativa do Teams for liberada com licença para todo o time — ela passa
  a ser o caminho barato e esta decisão vira exceção para áudio de outra origem.
- Se a Microsoft passar a oferecer leitura de transcrição por escopo delegado.
- Se o volume crescer a ponto de a VM virar gargalo, ou se ela for descomissionada.
- Se a operação da VM custar mais atenção do time do que a assinatura que ela substituiu.

## Evidências

Nenhuma evidência externa anexada — a decisão é anterior à implementação. O que a
sustenta hoje é o código já existente:

- `src/services/microsoftGraphService.ts` — `getDriveDownloadUrl`, `GRAPH_SCOPES`,
  `FILES_SCOPES` e a criação de reunião do Teams (`withTeamsMeeting`).
- `supabase/migrations/20260805220000_project_ritos.sql` — vínculo projeto ↔ série.
- `supabase/functions/market-analysis-start` e `-status` — formato de job assíncrono.
- `.harness/integrations/onedrive.md` — quirks de `sharedWithMe` e estado do consentimento.
