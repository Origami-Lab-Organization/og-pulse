---
name: arquivos-de-projeto
description: Sobe, organiza e consulta arquivos na pasta do projeto no OneDrive da Origami Lab, a partir de uma conversa, usando o MCP og-pulse-drive. Use quando alguém falar em enviar arquivo para um projeto, criar pasta, ver o que está guardado — "sobe essa ata na execução do Cobrança Automática", "o que tem nos contratos do projeto X" — e também quando o MCP falhar, para explicar o que aconteceu e como resolver.
---

# Arquivos de projeto no OneDrive

## O que é o Pulse

Quando alguém da Origami Lab fala em **Pulse** (ou og-pulse), é o sistema
interno de gestão da empresa: projetos, equipe, orçamentos, timesheets,
pipeline comercial. Cada projeto no Pulse pode apontar para uma pasta no
OneDrive, e é lá que os arquivos daquele projeto vivem.

Você opera esses arquivos pelo servidor MCP **`og-pulse-drive`**, que faz duas
coisas: consulta o Pulse para descobrir qual pasta pertence a qual projeto, e
fala com o OneDrive para ler e escrever de verdade.

Se as ferramentas do `og-pulse-drive` não aparecerem para você, o MCP não está
instalado nesta máquina — veja "Quando nada funciona" no fim.

## O que você precisa entender antes

**Você não decide quem tem acesso a nada.** Todas as chamadas usam a conta
Microsoft da pessoa que está conversando com você. Se ela não tem acesso a uma
pasta, o OneDrive recusa — isso é o comportamento correto, não uma falha para
contornar. Nunca sugira caminhos alternativos para alcançar algo negado.

**Escrita no OneDrive é real e compartilhada.** O que você sobe ou apaga aparece
para todo mundo com acesso à pasta, inclusive quem nunca abriu o Pulse. Não
existe desfazer.

**O servidor roda na máquina da pessoa.** Ele enxerga o disco dela, não o seu
ambiente. Se um arquivo foi anexado nesta conversa, ele **não existe** no
computador dela — use `content_base64` nesse caso (veja abaixo).

## Estrutura padrão de projeto

| Pasta | O que vai nela |
|---|---|
| `1.Propostas` | Propostas comerciais, versões, apresentações de venda |
| `2.Contratos` | Contrato assinado, aditivos, documentos jurídicos |
| `3.Execução` | Material do dia a dia: atas, entregas, planilhas, evidências |

Quando a pessoa não disser a pasta, deduza pela natureza do arquivo e **confirme
antes de subir**. Ata vai para `3.Execução`; contrato assinado vai para
`2.Contratos`. Se não for claro, pergunte — não jogue na raiz.

Nome de pasta é comparado sem acento e sem diferenciar maiúscula: "execução",
"Execucao" e "3.Execução" chegam ao mesmo lugar.

## De onde vem o arquivo

O `upload_to_project` aceita três origens. Escolha na ordem:

1. **`source` com caminho absoluto** — arquivo no computador da pessoa.
   `/Users/fulano/Downloads/ata.docx`. Preferível: sem limite prático e sem
   consumir contexto.
2. **`source` com URL https** — o servidor baixa e sobe.
3. **`content_base64` + `file_name`** — arquivo **anexado nesta conversa**, que
   você consegue ler mas que não está no disco dela. Máximo 5MB. Sempre informe
   `file_name` com a extensão correta.

Se a pessoa anexou o arquivo aqui e você tentar usar `source` com um caminho do
seu ambiente, vai falhar — aquele caminho não existe na máquina dela.

## Fluxo de trabalho

1. **Identifique o projeto** com `find_project`. Mais de um resultado? Mostre e
   pergunte — nunca escolha por conta.
2. **Veja o destino** com `list_project_folder` antes de escrever.
3. **Confirme** em uma frase o que vai ser enviado e para onde.
4. **Execute** com `upload_to_project` ou `create_project_folder`.
5. **Relate** o caminho completo onde o arquivo ficou.

Para consulta, vá direto ao passo 2.

## Regras de conduta

- **Confirme antes de qualquer escrita.** Consulta pode ser direta.
- **Nunca adivinhe o projeto.** "O projeto da Retífica" pode ser vários.
- **Preserve a extensão** ao renomear — é ela que faz o arquivo abrir certo.
- **Um arquivo por vez**, salvo pedido explícito de lote.
- **Não repita conteúdo sensível** de documento no chat. Nome de arquivo é
  informação de negócio.

## Diagnóstico de falhas

Você é o primeiro suporte. Traduza o erro e diga o próximo passo concreto —
nunca devolva a mensagem técnica crua.

### "Conta Microsoft não autorizada"

A pessoa nunca autorizou, ou a autorização expirou. Chame `microsoft_login`,
passe a URL e o código, e peça para ela concluir no navegador. Depois é só pedir
o comando de novo — a autorização fica guardada em disco e é retomada sozinha.

### "Ainda aguardando você concluir em ... com o código ..."

Ela começou o login mas não terminou no navegador. Repita a URL e o código.
Não inicie um login novo: isso invalidaria o código que ela já tem em mãos.

### "O código expirou"

Passaram-se mais de 15 minutos. Chame `microsoft_login` de novo.

### "Não consegui iniciar a autorização" / erro com AADSTS7000218

O app no Microsoft Entra ID não permite fluxo de cliente público. **Não é algo
que a pessoa resolve sozinha** — o administrador precisa ligar *"Allow public
client flows"* nas configurações de autenticação do app. Diga isso e sugira
falar com o time de tecnologia.

### "Pulse: sem sessão" ou "Não consegui entrar no Pulse com essas credenciais"

O e-mail e a senha do Pulse não estão configurados, ou estão errados. Peça para
rodar de novo, na pasta do repositório og-pulse:

```
bash apps/mcp-drive/install.sh
```

O instalador pergunta as credenciais e reconfigura tudo. Se ela entra no Pulse
só pelo botão da Microsoft e nunca criou senha, aí é caso para o time de
tecnologia — ela precisa de uma senha definida.

### "Nenhum projeto com pasta vinculada encontrado"

Duas causas possíveis, e vale checar a segunda antes de concluir a primeira:

1. O projeto existe mas ninguém escolheu a pasta dele no OneDrive. Alguém com
   permissão de gerente precisa vincular na aba **Arquivos** do projeto no Pulse.
2. A sessão do Pulse não está ativa — nesse caso a busca não consulta nada e o
   resultado vazio engana. Rode `microsoft_status` para conferir se aparece o
   e-mail do Pulse antes de afirmar que o projeto não tem pasta.

### "Você não tem acesso a esta pasta" / erro 403

Não é problema técnico. A pessoa realmente não tem acesso àquela pasta no
OneDrive. Sugira pedir ao gerente do projeto. **Não tente outro caminho.**

### "Pasta não encontrada"

O erro já lista as pastas disponíveis naquele nível. Mostre a lista e pergunte
qual ela quis dizer.

### "Arquivo acima de 100MB" ou "conteúdo inline acima de 5MB"

Para inline, peça o caminho do arquivo no computador. Para acima de 100MB,
sugira enviar direto pelo OneDrive.

## Quando nada funciona

Se as ferramentas do `og-pulse-drive` sequer aparecem, o MCP não está instalado.
Oriente:

1. Ter o repositório **og-pulse** no computador (pedir ao time de tecnologia).
2. Ter Node.js 20 ou maior — `node -v` no Terminal confirma.
3. Rodar, na pasta do repositório: `bash apps/mcp-drive/install.sh`
4. Reiniciar o Claude Desktop, se for esse o cliente.

O passo a passo completo em linguagem não técnica está em
`apps/mcp-drive/INSTALACAO.txt`, no repositório.

## O que NÃO fazer

- Não suba arquivo em projeto que você não confirmou com a pessoa.
- Não crie estrutura de pastas "para organizar" sem alguém pedir.
- Não trate erro de permissão como problema a resolver: é uma decisão de acesso
  que alguém tomou no OneDrive.
- Não invente caminho de arquivo. Se não souber onde está, pergunte.
