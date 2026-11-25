# Refino — fluxo da qualificação da empresa ao fim do projeto

> Rascunho de refinamento, aberto em 24/11/2026 com Victor Couto. Não é história: é o registro
> das decisões que vão virar histórias (catálogo, formas de receita, orçamento composto, empresa
> e cliente, Ganho, regularização dos ativos, encerramento com renovação). A US-0043 e a US-0045
> ficam paradas até este refino fechar.

## Retrato de produção (Origami Lab, 24/11/2026, leitura)

- Catálogo: 1 linha ("Serviços Gerais") com 7 serviços: Consultoria Estratégica, Dev. de
  Software, Financiamento da Inovação, Lei do Bem, Programa de Inovação, Sprint 0, Ventures.
- Quatro listas de classificação que não batem: modelo de receita do serviço
  (`service_revenue_models.model_type`), tipo do orçamento (`budgets.billing_type`), tipo no
  Ganho (`CloseBusinessDialog`) e a lista fixa de linhas do fit e dos projetos antigos
  (`SERVICE_LINE_OPTIONS` em `src/types/serviceLine.ts`).
- A Oportunidade (`prospects`) e o orçamento (`budgets`) não guardam o serviço.
- 29 Ganhos, 9 sem orçamento. 16 projetos ativos: 10 sem orçamento, 5 sem serviço, 1 sem
  Oportunidade de origem (Lei do Bem Prumo). Os 16 estão com `status = planning`.
- 24 clientes: 13 ligados a uma empresa, 2 a duas (Bry, Syngularid), 2 soltos com empresa de
  mesmo CNPJ (Prumo, Tecno2000), 7 sem empresa. 3 clientes só têm orçamento, sem projeto.

## Decisões confirmadas (Victor Couto, 24/11/2026)

### Catálogo
- Linhas de serviço para 2027: **Projetos**, **Fomento** e **Governo**.
- Serviços: Projetos → Consultoria, Dev. de Software. Fomento → Lei do Bem, Acesso a Capital,
  Consultoria. Governo → Workshop Sebrae, Dev. de Software.
- Ventures foi linha só de 2026: fica desativada/arquivada. Projetos existentes continuam nela.

### Formas de receita
- Lista única: **escopo fixo**, **recorrente**, **taxa de sucesso (percentual)** e **cobrança
  por hora** (nome escolhido no lugar de "time and material").
- Indicação é alavanca e pode gerar só comissão. Equity acompanha Ventures e sai.
- Escopo fixo: parcelas com data. Recorrente: mensalidade até a renovação.
- Percentual: sobre o potencial benefício gerado. Na Lei do Bem, a receita acompanha o uso do
  benefício (mensal ou trimestral), conforme o recolhimento de impostos do cliente. Projeto
  baseado em sucesso guarda o valor que geramos e o valor que recebemos.
- Cobrança por hora: horas aprovadas no timesheet × tarifa do cargo, por mês. Pode ter teto ou
  piso de horas.

### Orçamento
- Um orçamento pode combinar formas de receita; o comercial informa quais compõem.
- Custos continuam únicos, do projeto como um todo. Falta analisar quais gastos entram e como
  são lançados.
- O orçamento guarda o serviço e pertence à Oportunidade.
- O Ganho exige orçamento. O projeto herda serviço, formas de receita e valores.
- Mudança de escopo depois do Ganho é **aditivo** no mesmo orçamento. Orçamento novo é para
  expansão: novas fases ou outros projetos.

### Empresa e cliente
- Um cadastro só, a empresa. Cliente é a empresa que teve Ganho. Orçamento não cria cliente.
- Precisa ficar claro como identificar quem é ou já foi cliente e o histórico de projetos.
- Registros atuais tratados caso a caso, um de cada vez.

### Pipeline
- O serviço é escolhido na Oportunidade, ao qualificar.
- Projeto interno e produto interno **não** passam pela Prospecção: têm um caminho próprio de
  criação, que libera a equipe alocada para lançar horas.
- Renovação cria projeto novo.
- Status e fase do projeto viram uma marcação só.

### Projetos ativos
- Regulariza os 16 ativos; os encerrados ficam como estão.
- Os 10 ativos sem orçamento não ganham orçamento: só a informação "sem orçamento". Vale o
  planejado × realizado.
- Lei do Bem Prumo ganha a Oportunidade de origem já como Ganho, sem orçamento.

## Decisões da segunda rodada (Victor Couto, 24/11/2026)

- **Projeto é só do portfólio que gera receita.** Projeto interno e produto interno saem do
  fluxo comercial, são planejados de outro jeito e precisam de regra de quem cria. Exceções
  agora são aceitas porque as regras valem daqui para frente.
- **Não existe forma recorrente.** A Origami vende projetos que podem ou não renovar
  automaticamente. Cada projeto tem uma ou mais formas de receita. Recorrente seria para SaaS,
  fora de projetos.
- **Formas de receita:** escopo fixo, percentual (taxa de sucesso), cobrança por hora e
  comissão por indicação (receita que a Origami recebe por indicar).
- Aditivo × orçamento novo: aditivo muda valor, prazo ou horas do mesmo projeto; orçamento novo
  é Oportunidade nova de expansão.
- **De-para só dos ativos.** Oportunidades e projetos encerrados não mudam. Linhas e serviços
  antigos ficam desativados, para manter o rastro.
- Filtro por serviço sozinho ou com a linha.
- O fit por serviço passa a usar o catálogo.
- O catálogo novo vale a partir da entrada em produção.
- O admin define linhas, serviços e as formas de receita aceitas por serviço, exclusivas ou
  combinadas.
- **Governo:** o cliente é o Sebrae. Um pipeline próprio para editais de governo está em
  construção e será desta linha.
- **Percentual:** o GP lança o benefício potencial e o utilizado, pelo valor real da NF. Lei do
  Bem dura em geral um ano, com renovação automática; o percentual vale durante o projeto e pode
  ser revisado antes de renovar.
- **Cobrança por hora:** tarifa travada no Ganho (negociada no contrato, não segue a tabela);
  só as horas dos cargos do orçamento contam; ao bater o teto, o Pulse avisa e pergunta:
  bloquear, lançar sem faturar ou lançar cobrando com consentimento do cliente; o piso fatura o
  mínimo e é informado no orçamento.
- **Comissão paga** (custo do orçamento) pode ser percentual ou valor.
- **Orçamento:** estados Rascunho, Enviado, Aceito, Recusado e Vencido. Vale a última versão
  aceita; só um orçamento aceito por Oportunidade.
- **Matriz e filial** contam como a mesma empresa, informadas no cadastro.
- **Injetoras NS** (sem CNPJ): os projetos dela não são considerados na ferramenta.
- **Sem orçamento:** todo projeto futuro terá orçamento. Projeto em andamento sem orçamento não
  compara com nada; o planejado vira a linha de base.
- **Pré-venda:** as horas antes do Ganho vão para a linha de atividades internas do comercial,
  que já existe.

## Decisões da terceira rodada (Victor Couto, 25/11/2026)

- **De-para dos ativos:** Compete Minas é Fomento. UNIFOR é Projetos › Dev. de Software, um
  projeto curto oferecido de graça como entrada em possível cliente. Injetoras fica no Pulse
  como está, sem CNPJ, até terminar neste mês; não haverá projetos novos com esse perfil.
- **Fomento para a própria Origami** (ex.: Compete Minas) gera um projeto de Dev. de Software
  na linha Projetos. O trabalho segue em dois quadros: o de fomento, para acompanhar e declarar o
  que foi feito, e o de projetos, para gerir a execução. Forma de ligar os dois a definir.
- Receita ponderada (exemplo dos 60%) e orçamento só a partir de Oportunidade qualificada:
  aceitos.
- **Situação única do projeto:** Pausado e Cancelado não são colunas; são marcas dentro da
  coluna, aplicadas pelo GP ou admin.
- **Dois quadros de portfólio:** o atual fica para as linhas Projetos e Governo. Fomento ganha
  quadro próprio, com fases a definir pelo perfil desses projetos.
- **Lei do Bem renova no mesmo card:** a renovação registra, no card, os valores e o percentual
  do novo ano.
- **Comissão por indicação:** percentual sobre o valor que o parceiro cobra. Ex.: a Origami
  indica a Bry para a PIN; a PIN submete um pleito de R$ 5 mi à FINEP e cobra 5% se der certo;
  a Origami recebe 20% desses 5%, à medida que a Bry recebe a verba (às vezes parcelada) e
  repassa à PIN. Gera um projeto no portfólio de Fomento, para cobrar e acompanhar.
- **Projeto e produto interno:** por enquanto só o admin cria. O planejamento é o mesmo de Dev.
  de Software (objetivos, roadmap, equipe, custos, stakeholders) e sempre há um gerente
  responsável.
- **Teto de horas:** o alerta sai a 90% e ao bater o teto, para o GP no projeto. O orçamento já
  define o comportamento combinado com o cliente (ex.: na 99 há um mínimo e o excedente
  pequeno não é cobrado).
- **CNPJ de faturamento:** definido no Ganho; o comercial ou o GP pergunta ao cliente.

## Decisões da quarta rodada (Victor Couto, 25/11/2026)

- **Cortesia:** forma de receita para projeto de entrada gratuito. Tem custo de equipe e outros
  custos, e é planejado como um projeto comum; fica fora dos indicadores de receita e margem.
- **Chance da receita ponderada:** o comercial ajusta no orçamento; o admin também, pela
  permissão total.
- **Parceiro:** marca própria da empresa (ex.: PIN), separada de Cliente.
- **Custos do orçamento:** viagem já cobre por enquanto, mais um "Outros" para o GP.
- **Aditivo:** aprovado pelo comercial e pelo GP; conta nos indicadores do comercial, marcado
  como expansão.
- **Renovação em Projetos:** continua sendo projeto novo, aberto por Oportunidade de expansão.
- **Ciclo da Lei do Bem:** a GP atualiza os dados de cada projeto quando a mudança entrar em
  produção.
- **Indicação:** Bry aparece como atendida e PIN como pagadora; o Pulse acompanha valor do
  pleito, percentual do parceiro, percentual da Origami e cada parcela liberada. Só
  acompanhamento financeiro: sem equipe nem horas.
- **Fomento da própria Origami:** opção A, dois cards ligados (um no Fomento, outro em
  Projetos), cada um com seu quadro de atividades.

## Decisões da quinta rodada (Victor Couto, 25/11/2026)

- **Cancelados:** aba "Cancelados" no Portfólio, fora do quadro, com projeto, cliente, linha,
  serviço, data, quem cancelou, motivo e valor que deixou de ser recebido. Pausado fica na
  coluna com a marca. Os dois ficam fora dos indicadores de entrega.
- **Lei do Bem:** um card por ano-base do projeto, para acompanhar as atividades e o benefício
  obtido em cada ano. O contrato fica atrelado ao card ativo do ano-base. Regras em
  refinamento (criação do próximo card, percentual que muda no meio do ano).
- **Consultoria de Fomento:** projeto para escrever o pleito que será submetido (ex.: Meu Ninho,
  para a FINEP).
- **Aditivo:** o GP conduz, por ter a relação com o cliente; o comercial precisa estar próximo
  para expandir. Forma de envolver o comercial em refinamento.

## Decisões da sexta rodada (Victor Couto, 25/11/2026)

- **Card do ano-base da Lei do Bem:**
  - nasce sozinho em 1º de janeiro, se o contrato estiver em vigor;
  - só abre depois que o GP aprova, definindo os percentuais e o benefício esperado no ano;
  - percentual que muda no meio do ano: vale o percentual em vigor no mês em que o benefício foi
    utilizado;
  - o primeiro card vem do orçamento do Ganho; os anos seguintes, do registro da renovação no
    card, sem orçamento novo. Orçamento novo só para expansão.
- **Colunas do Fomento:**
  - Lei do Bem: Levantamento dos projetos de inovação → Apuração do benefício → Prestação de
    contas (FORMP&D) → Concluído;
  - Acesso a Capital: Busca do edital → Elaboração do pleito → Submissão → Resultado →
    Liberação das parcelas → Prestação de contas → Concluído. A Consultoria de Fomento entra
    neste quadro e vai para Concluído depois do Resultado, salvo se tiver taxa de sucesso.
  - Todo quadro termina em Concluído.
- **Aditivo:**
  - o GP registra e aprova;
  - o comercial da conta é avisado no sino;
  - conta como venda de expansão para o comercial da conta e para o GP;
  - escopo novo (nova fase ou outro serviço) vira Oportunidade de expansão do comercial da conta.
- **Comercial da conta:** é o responsável pela Oportunidade de origem e pode ser trocado na
  empresa.

## Roadmap proposto (25/11/2026)

Os números de US são dados ao escrever cada história (US-0046 a US-0048 reservadas em 25/11/2026). A US-0043 e a US-0045 existem e serão
revisadas.

| Ordem | Épico | Histórias |
|---|---|---|
| 1 | **Catálogo e formas de receita** | 1.1 (US-0046) Catálogo 2027: linhas Projetos, Fomento e Governo; serviços; formas aceitas por serviço, exclusivas ou combinadas; antigas desativadas · 1.2 (US-0047) Fit por serviço lendo o catálogo · 1.3 (US-0048) Filtro por serviço, sozinho ou com a linha |
| 2 | **Empresa e cliente** | 2.1 Cadastro único na empresa; cliente = empresa com Ganho; relação e histórico na ficha; matriz e filiais (US-0045 reescrita) · 2.2 Regularização caso a caso dos 11 clientes |
| 3 | **Orçamento composto** | 3.1 Orçamento da Oportunidade qualificada, com serviço e estados novos · 3.2 Componentes de receita: escopo fixo, percentual (cheia × ponderada), cobrança por hora (tarifa, teto, piso, regra do teto), comissão por indicação · 3.3 Custos do orçamento revisados, comissão paga em % ou valor · 3.4 Aditivo, com o comercial da conta |
| 4 | **Do Pipeline ao projeto** | 4.1 Serviço na Oportunidade ao qualificar · 4.2 Etapa Proposta e Ganho só com orçamento aceito, com o CNPJ de faturamento; o projeto herda tudo |
| 5 | **Portfólio de Projetos e Governo** | 5.1 Situação única, com Pausado e Cancelado como marcas · 5.2 De-para dos ativos e marca "sem orçamento"; planejado vira linha de base · 5.3 Alerta do teto de horas · 5.4 Encerramento com renovação (US-0043 revisada) |
| 6 | **Portfólio de Fomento** | 6.1 Portfólio de Fomento com dois quadros (Lei do Bem, Acesso a Capital) · 6.2 Lei do Bem: um card por ano-base, aberto com aprovação do GP; benefício potencial e utilizado pela NF; FORMP&D · 6.3 Acesso a Capital: pleito, liberação em parcelas, taxa de sucesso · 6.4 Indicação a parceiro · 6.5 Fomento da Origami ligado ao projeto de Dev. de Software |
| 7 | **Projetos e produtos internos** | 7.1 Criação só pelo admin, planejamento de Dev. de Software, gerente obrigatório, horas liberadas |
| — | Governo (editais) | Pipeline próprio em construção fora deste roadmap |

## Brechas levantadas em 24/11/2026 (respondidas nas rodadas acima)

Numeração igual à da conversa de 24/11/2026.

1. "Todo projeto tem orçamento" × três exceções (internos, 10 ativos, Lei do Bem Prumo).
2. Renovação cria projeto novo × contrato recorrente.
3. Fronteira entre aditivo e orçamento novo; aditivo conta como venda?
4. Serviços atuais sem destino no catálogo novo (de → para).
5. Mesmo nome de serviço em duas linhas.
6. Lista fixa do fit por serviço fora do catálogo.
7. Data de virada do catálogo de 2027.
8. Formas de receita permitidas por serviço.
9. Linha Governo: quem é o cliente e se o Pipeline atual serve.
10. Percentual: benefício apurado, prazo, margem com receita incerta.
11. Cobrança por hora: tarifa, horas que contam, teto e piso.
12. Indicação como receita da Origami.
13. Combinação de formas: qual data manda no Encerramento.
14. O que é "orçamento aprovado" e qual orçamento vale no Ganho.
15. Orçamento antes da Oportunidade qualificada.
16. Matriz, filial e cliente sem CNPJ.
17. Marcação única do projeto precisa de Pausado e Cancelado.
18. Ativos sem orçamento: com o que o planejamento compara; data do Ganho retroativo.
19. Horas de pré-venda antes do Ganho.
