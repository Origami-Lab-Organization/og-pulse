# ADR 0056: Cliente é relação da empresa, e o cadastro é um só

- Status: aceito
- Data: 2026-11-25
- Decisores: Victor Couto
- Relacionados: decisão de 15/09/2026 (`20260915110000_prospect_companies.sql`), ADR-0037,
  ADR-0040, ADR-0044, ADR-0045, US-0019, US-0045, US-0049 a US-0052

## Contexto

Em 15/09/2026 o Pulse separou a **empresa** (Prospecção) do **cliente** (carteira), para que uma
empresa só abordada não entrasse na carteira, nos indicadores nem no acesso de "ler clientes". A
ligação entre os dois ficou manual (`prospect_companies.client_id`) e falhou: em 25/11/2026, dos
24 clientes da Origami, só 13 tinham exatamente uma empresa. No Ganho, o diálogo pedia para
escolher ou cadastrar o cliente, redigitando o que a empresa já tinha; o orçamento também
obrigava a escolher ou cadastrar cliente, e foi assim que empresas sem nenhum Ganho entraram na
carteira.

O refino de 24 e 25/11/2026 decidiu: um cadastro só, a empresa; cliente é a empresa com Ganho ou
com projeto; orçamento não cria cliente; uma tela só, Empresas (US-0049).

Projetos, orçamentos, stakeholders, pedidos de reembolso e a conciliação do Conta Azul
(ADR-0044) apontam para `clients`. Trocar todas essas referências para a empresa de uma vez seria
uma migração grande e arriscada, sem ganho para quem usa o Pulse.

## Decisão

1. **A empresa é o cadastro.** Identificação (nome, razão social, CNPJ, site) e endereço moram na
   empresa; o endereço vem da Receita, do estabelecimento da matriz.
2. **Cliente é uma relação da empresa**, calculada como na US-0019: Cliente ativo (projeto em
   andamento) ou Já foi cliente (projeto encerrado ou Ganho sem projeto). Orçamento não conta.
3. **A linha de `clients` continua**, como o registro da carteira para o que já aponta para ela,
   mas **nasce da empresa e não é digitada**:
   - o gatilho `trg_prospects_ganho_torna_cliente` chama `garantir_cliente_da_empresa` quando a
     Oportunidade chega a Ganho, pela tela ou pelo MCP; a função liga o cliente de mesmo CNPJ ou
     cria um com os dados da empresa;
   - o gatilho `trg_prospect_companies_sincroniza_cliente` copia para o cliente a identificação e
     o endereço sempre que a empresa muda;
   - as duas funções são `SECURITY DEFINER`: quem registra o Ganho não precisa poder escrever na
     carteira. `garantir_cliente_da_empresa` não tem EXECUTE para quem usa o app.
4. **O Ganho e o orçamento não cadastram cliente.** O cadastro de cliente perde endereço e
   contatos: endereço vem da Receita, e contatos são os da empresa (ADR-0045).
5. **Vale daqui para frente.** Os registros atuais são regularizados caso a caso (US-0052).

## Consequências

- O Ganho não pede cliente; o projeto fica ligado à empresa pelo cliente dela.
- A carteira deixa de crescer por orçamento.
- Mudar a identificação da empresa muda o cliente; o caminho inverso deixa de existir com a
  US-0049, quando a identificação passa a ser editada só na empresa.
- Desfazer um Ganho não apaga o cliente criado por ele: a relação calculada deixa de mostrar
  "cliente", mas a linha de `clients` fica.
- Uma futura troca das referências de `clients` para a empresa continua possível; esta decisão
  não a impede.
