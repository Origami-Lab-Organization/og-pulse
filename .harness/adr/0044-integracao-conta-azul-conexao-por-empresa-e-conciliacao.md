# ADR-0044 — Integração com o Conta Azul: conexão por empresa, só leitura, conciliação no Pulse

- **Data:** 01/10/2026
- **Status:** proposta
- **Decisores:** Italo Castro
- **Contrato:** [`.harness/integrations/conta-azul.md`](../integrations/conta-azul.md)
- **Relacionadas:** [ADR-0031](0031-centro-de-custo-como-ancora-de-custo-e-receita.md) (centro de custo como âncora), [ADR-0027](0027-capacidade-derivada-de-papel.md) (capacidade), [ADR-0004](0004-installment-nf-admin-alerts.md) (cron de Edge Function)

## Contexto

Os números financeiros do Pulse não batem com a realidade, e o lugar onde a realidade está
registrada é o Conta Azul: é lá que o financeiro interno da Origami lança recebimentos,
pagamentos e notas. Sem uma ponte entre os dois, ninguém consegue dizer qual número está
errado — só que eles são diferentes.

Parte do erro estava no próprio Pulse e foi corrigida antes desta decisão (PR #54: leituras
cortadas em 1000 linhas e "previsto" com dois significados). O que sobra é comparar o que o
Pulse acha que aconteceu com o que o Conta Azul registrou.

Decisões do Italo em 01/10/2026 que moldam o desenho:

- **Recurso para todas as empresas do Pulse desde já**, não só para a Origami.
- **Contas a receber e contas a pagar juntas** na primeira entrega.
- O Conta Azul da Origami **usa centro de custo**, mas não se sabe ainda quais.

Fatos da API que pesam (detalhe e fontes no contrato):

- OAuth2 Authorization Code; **uma autorização vale para uma empresa do ERP**.
- **Não existe escopo de leitura.** O app recebe permissão de administrador da conta.
- O refresh token **rotaciona a cada uso**: renovar duas vezes ao mesmo tempo derruba a
  conexão.
- **Não há webhook.** Sincronizar é polling, com limite de 10 req/s por conta conectada.
- A documentação não diz como exclusão e cancelamento aparecem na sincronização incremental.

## Decisão

### 1. Cada sistema manda no que registra

O **Conta Azul manda no realizado**: recebido, pago, data da baixa, valor líquido, nota
emitida. O **Pulse manda no contratado e no planejado**: parcela prevista, alocação, custo-hora
estimado, centro de custo do trabalho.

Nesta fase o Pulse **não escreve no Conta Azul**. A conciliação mostra a divergência e quem
corrige é a pessoa, no sistema que manda naquele dado — **com uma exceção, decidida pelo Italo
em 01/10/2026:** quando a parcela do Pulse casa **forte** com uma parcela quitada do Conta Azul
(número da NF e CNPJ iguais, item 6), o Pulse marca a parcela como recebida sozinho, com a data
da baixa. É o realizado chegando de quem manda nele. O valor da parcela do Pulse não muda; se o
bruto diverge, a conciliação aponta. Toda marcação automática fica registrada (quem: Conta
Azul; quando; qual parcela de lá) e pode ser desfeita na conciliação. Casamento fraco nunca
marca nada.

### 2. Uma conexão por empresa do Pulse

Existe **um app Conta Azul — o do Pulse**. Cada empresa do Pulse (tenant) autoriza a própria
conta do Conta Azul e ganha uma conexão. Uma conta do Conta Azul (`id_empresa`) só pode estar
ligada a **uma** empresa do Pulse: ligar a mesma conta em dois tenants duplicaria o financeiro
dela em dois lugares, e a Origami já tem dois tenants com o mesmo nome em produção.

### 3. O token nunca sai do servidor e é cifrado com chave fora do banco

Access e refresh token ficam cifrados (AES-256-GCM) com uma chave guardada como secret das
Edge Functions, numa tabela com RLS ligada e **nenhuma policy** — nem `authenticated` nem
`anon` leem. O navegador nunca vê token; nenhum log imprime token, código de autorização ou
segredo do app.

Chave fora do banco, e não Vault, porque a service key do Supabase já esteve em arquivo local
e já vazou uma vez: com o Vault, quem tem a service key e uma função definer lê o token; com a
chave nas Edge Functions, o banco sozinho só entrega texto cifrado.

A renovação é **serializada por conexão** (trava na linha da conexão). Como o escopo é de
administrador, o adaptador do Conta Azul **só expõe chamadas de leitura** nesta fase —
escrever exigiria mudar o adaptador, e isso passa por revisão. Desconectar chama a revogação
do Conta Azul, além de apagar o token local.

### 4. Espelho mínimo, sem payload bruto

O Pulse guarda **só os campos que a conciliação usa** — não o JSON inteiro da resposta.
Contas a pagar carregam pagamento de folha e de pessoa física: guardar o bruto seria guardar
salário e CPF sem precisar. Documento de pessoa é guardado **só quando é CNPJ**; CPF não entra.

### 5. Sincronização por polling, em três ritmos

- **Incremental, a cada 30 min:** `alteracoes` devolve os eventos salvos desde o último cursor;
  cada evento é relido por `/{id_evento}/parcelas`. O cursor recua uma margem para não perder
  o que foi salvo durante a leitura.
- **Carga inicial em lotes:** na primeira conexão, `buscar` por janela de vencimento, em
  pedaços que caibam no tempo de uma execução; o cron continua de onde parou.
- **Varredura diária:** relista as parcelas da janela e marca como removida a que sumiu, até
  sabermos como o Conta Azul sinaliza exclusão.

O ritmo fica abaixo de 10 req/s por conta, com recuo exponencial em 429.

### 6. Conciliação

**Receber** — parcela do Pulse (`project_installments`) × parcela de receita do Conta Azul:

| Força | Critério | Resultado |
|---|---|---|
| Forte | número da NF igual **e** CNPJ do cliente igual | casado |
| Fraca | CNPJ igual **e** valor bruto igual **e** vencimento a até 7 dias | sugerido — pede confirmação |
| — | nenhum dos dois | só no Pulse / só no Conta Azul |

Num par casado, divergência é valor bruto, status (recebido × quitado) e data de pagamento.
Valor líquido menor que o bruto é **retenção de imposto**, mostrada como informação — não é
erro.

**Pagar** — em dois níveis, porque o custo do Pulse é em boa parte estimado:

- **Por centro de custo e mês:** despesa do Conta Azul (rateio por centro, por competência) ×
  custo do Pulse por centro (ADR-0031). É aqui que aparece a distância entre o salário
  estimado e a folha paga.
- **Por item:** custo de projeto com fornecedor (`project_costs` + `suppliers.cnpj`) × parcela
  de despesa, por CNPJ, valor e data.

O mapeamento centro do Pulse ↔ centro do Conta Azul é **cadastro manual do admin**: os nomes
não precisam ser iguais, e não sabemos ainda quais a Origami usa lá. Casamento sugerido só
vale depois de confirmado por uma pessoa; o confirmado fica gravado.

### 7. Quem acessa

| Capacidade | O que libera | Seed |
|---|---|---|
| `integracoes:gerir` | conectar, desconectar, sincronizar agora, mapear centros de custo | Admin |
| `conciliacao:receber` | ver a conciliação de receber e confirmar ou desfazer casamentos | Admin |
| `conciliacao:pagar` | ver a conciliação de pagar e confirmar ou desfazer casamentos | Admin |

Receber e pagar são capacidades separadas por decisão do Italo (01/10/2026). O seed da parte 1
deu `conciliacao:receber` também ao Gerente; no mesmo dia o Italo decidiu que o menu
**Financeiro fica só com Admin** e que **o Gerente vê o recebimento pelo projeto**, como já via
— a parte 3 (`20261001140000`) tira a capacidade dele. Liberar de novo é toggle de perfil. A de pagar fica só com Admin porque traz pagamento de folha (boundary de salário e dado
pessoal). A RLS do espelho segue a mesma divisão: a linha de receita se lê com
`conciliacao:receber`, a de despesa com `conciliacao:pagar`.

### 7a. Onde aparece e desde quando

Decisões do Italo (01/10/2026): a conciliação ganha **tela própria** (A receber / A pagar,
item a item, onde se confirma e desfaz) **e** o Analytics Financeiro passa a mostrar o número
do Pulse ao lado do número do Conta Azul. A primeira carga traz o histórico **desde
01/01/2025**.

### 8. Entrega em quatro partes

1. **Conexão** — conectar, ver a empresa ligada, desconectar.
2. **Sincronização** — espelho de parcelas, pessoas e centros de custo; mapeamento de centros.
3. **Conciliação de receber.**
4. **Conciliação de pagar.**

Cada parte é um PR e funciona sozinha.

## Consequências

**Ganhos**

- O Pulse passa a dizer **onde** o número diverge, e não só que diverge.
- O caminho para lançar no Conta Azul pelo Pulse (fase 2) fica pronto pela metade: conexão,
  token e mapeamento já existem.
- Qualquer empresa do Pulse que usa Conta Azul ganha a mesma conciliação.

**Custos**

- O Pulse passa a guardar token de administrador do ERP de clientes. É a integração com mais
  poder que o produto já teve.
- Recurso para todas as empresas exige tela de conexão, mensagens de erro para quem não é da
  casa e suporte.
- Um app de produção no portal do Conta Azul, com a URL de retorno do Pulse.

**Riscos**

- **Credencial do app vazada = app excluído sem aviso** pelo Conta Azul, e todas as conexões
  caem juntas. O segredo do app vive só nos secrets das Edge Functions.
- **Exclusão e cancelamento não documentados** na sincronização incremental. A varredura
  diária cobre, mas precisa ser validada na conta de desenvolvimento.
- **Homologação de app público não está documentada.** Se o Conta Azul exigir aprovação para
  outras empresas conectarem, a parte "para todas" espera por ela.
- **Casamento fraco pode errar.** Por isso sugerido nunca vira casado sem uma pessoa.

**Como reverter**

- Desligar o cron (`cron.unschedule`), revogar as conexões e apagar as tabelas espelho. Tudo
  ali é cópia do Conta Azul; nada do Pulse depende delas.

## Pendências

- [ ] Italo cria o app de produção no portal do Conta Azul, com a URL de retorno do Pulse.
- [ ] Levantar os centros de custo do Conta Azul da Origami (sai sozinho depois da parte 2).
- [ ] Validar, na conta de desenvolvimento, como exclusão e cancelamento aparecem.
