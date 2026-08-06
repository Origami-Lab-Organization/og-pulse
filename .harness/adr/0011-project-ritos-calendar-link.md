# ADR 0011: Vínculo de ritos de projeto a eventos de calendário

- Status: aceito
- Data: 2026-08-05
- Decisores: Origami Lab / operacao interna

## Contexto

A reunião de Gerentes de Projeto acontece a cada quinze dias e um dos pontos é
verificar se os ritos de cada projeto estão acontecendo. Hoje isso é relato
verbal: não há registro de quais ritos cada projeto mantém nem com que
frequência.

Os ritos existem como compromissos recorrentes na agenda Microsoft de cada
pessoa ("Daily Tecnoflow", "[TecnoFlow] Planning", "Daily Retifica"), criados
fora do Pulse e em geral antes desta decisão. A integração com o Microsoft Graph
(ver `jornadas/docs/poc-microsoft-365.md`) já lê e cria eventos, mas com escopo
delegado que alcança somente `/me` — a agenda de quem está usando o sistema.

## Decisão

### Taxonomia fixa

Os ritos são `daily`, `planning`, `review`, `retro` e `outro`. Lista fechada em
código, não configurável por projeto: o relatório precisa comparar projetos
entre si, e taxonomia por projeto destruiria a comparação. `outro` existe como
escape para o caso raro, sem virar porta de entrada para invenção.

### Identidade do evento: `iCalUId`, não o id do evento

O `id` de um evento no Graph é **por caixa de correio**: a mesma reunião tem id
diferente na agenda de quem organiza e na de cada convidado. Guardar o `id`
faria o vínculo funcionar apenas para quem o criou — qualquer outro participante
não reconheceria a reunião na própria agenda.

O `iCalUId` é o mesmo em todas as caixas para a mesma reunião, e é ele que
guardamos como identidade. Consequências:

- Quem vincula não importa. Não é exigido ser o organizador.
- Qualquer participante que abrir o Pulse consegue localizar a série na própria
  agenda e registrar as ocorrências.
- Localmente, cada cliente resolve `iCalUId` → série própria → ocorrências, sem
  depender de ids de outra caixa.

### Vínculo na série, não na ocorrência

Um rito é vinculado ao compromisso recorrente, não a cada ocorrência. Marcar
ocorrência por ocorrência seria trabalho manual recorrente e mataria a adoção.
Custo real por projeto: quatro vínculos, uma vez.

### O vínculo mora no nosso Postgres

A alternativa era marcar no próprio evento da Microsoft (`categories` ou
propriedade estendida). Foi recusada: para montar o relatório o gestor precisaria
ler a agenda de todos os gerentes, o que exigiria `Calendars.Read.All` como
permissão de aplicação — o sistema passaria a poder ler a agenda de qualquer
pessoa da empresa. Exposição desproporcional ao benefício.

Com o vínculo no Postgres, o fato reportável fica visível ao gestor sem ninguém
ler agenda alheia.

### Ocorrências são registradas, não pré-agregadas

A tabela guarda uma linha por ocorrência observada, com a data. A janela de
quinze dias é filtro de consulta, não formato de armazenamento. Guardar a
contagem pronta tornaria o número inauditável ("por que 8?") e amarraria o
relatório a uma janela fixa.

Ocorrências canceladas são registradas como tais: "a Daily existe mas foi
cancelada em cinco dos dez dias" é justamente o sinal que a reunião procura, e
seria invisível se contássemos apenas o que sobrou.

### O coletor é o cliente de cada participante

Como o escopo alcança só `/me`, não há job de servidor capaz de varrer as
agendas. Quem registra as ocorrências é o Pulse de cada participante ao abrir a
agenda. Em troca, o relatório exibe por projeto quando foi a última
sincronização; dado velho aparece como velho em vez de passar por atual.

### Marcação opcional, sempre

Nenhum formulário exige rito ou projeto. Campo obrigatório produziria escolha
aleatória para vencer a tela, e dado inventado é pior que dado ausente porque
ninguém desconfia dele. A agenda no Pulse é conveniência: exigir projeto em todo
evento empurraria as pessoas de volta ao Outlook.

O que faz a marcação acontecer sem obrigatoriedade:

- O estado "sem rito vinculado" aparece no relatório e é cobrado na própria
  reunião de GPs, que já existe.
- O sistema sugere vínculos a partir das séries recorrentes da agenda, cruzando
  título com nome de projeto (a convenção de nomes do time já codifica os dois).

### Três estados no relatório

"Nunca vinculado", "vinculado sem ocorrência no período" e "vinculado com
ocorrências" são estados distintos e precisam aparecer distintos. O primeiro é
falha de adoção do Pulse; o segundo é o time ter parado de fazer o rito. Juntar
os dois num "não fez" faria cobrar a pessoa errada.

### Autorização

Leitura segue o [ADR-0002](0002-project-portfolio-pm-resource-access.md):
admin e gerentes veem os projetos do tenant. Escrita do vínculo é por recurso —
admin, o gerente do projeto (`can_manage_project`) ou quem é membro do projeto.
Marcar reunião que não se organizou é inofensivo; vincular rito a projeto alheio
não é.

## Consequências

- Existe registro comparável de ritos por projeto, base do relatório da reunião.
- O relatório responde "o rito está **agendado**", não "o rito **aconteceu**".
  A distinção precisa estar explícita na tela; presença real exigiria
  confirmação por ocorrência ou leitura de presença, fora deste escopo.
- Projetos cujos participantes não conectaram a conta Microsoft aparecem sem
  dados de ocorrência, com o vínculo ainda visível.
- Se a série for alterada ou excluída no Outlook, o vínculo fica órfão até que
  algum participante abra o Pulse e a sincronização perceba.

## Alternativas consideradas

- **Marca no evento da Microsoft** — recusada pela permissão de leitura ampla
  que o relatório exigiria.
- **Contagem de quinze dias pré-agregada** — recusada por tornar o número
  inauditável e a janela imutável.
- **Rito obrigatório na criação** — recusada por gerar dado inventado e afastar
  o uso da agenda no Pulse.
- **Restringir marcação ao organizador** — recusada porque quem cria a Daily
  costuma ser o time, e quem precisa do reporte é o gerente.

## Pendência de verificação

O comportamento do `iCalUId` em ocorrências de série (igual ou derivado do
`iCalUId` da série mãe) precisa ser confirmado contra um evento real do tenant
antes de a sincronização de ocorrências ser considerada correta. O desenho
adotado — guardar o `iCalUId` da série e expandir ocorrências localmente pela
série resolvida — não depende dessa resposta, mas a validação evita surpresa.
