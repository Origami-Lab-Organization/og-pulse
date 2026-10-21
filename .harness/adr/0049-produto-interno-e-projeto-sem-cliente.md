# ADR 0049: Produto interno é um projeto, e projeto não faturável pode não ter cliente

- Status: aceito
- Data: 2026-10-21
- Decisores: Italo Castro (tech lead)
- Relacionados: ADR-0035 (faturável é do projeto; resolve a pendência de cliente que ele deixou),
  ADR-0027 (capacidade), ADR-0021 (RPC definer com tenant de `auth.uid()`), ADR-0046 (RLS sem
  custo por linha), ADR-0036 (configuração com vigência não reescreve o passado)

## Contexto

Pedido do Italo: "preciso no Pulse ter uma gestão de produtos internos. O próprio Pulse hoje
está como um projeto, ele é um produto interno. Harness a mesma coisa." O que gerir: investimento
acumulado, dono e equipe, roadmap e releases. E, sobre o modelo: "o produto é o projeto".

Estado em produção (21/10/2026): o projeto "Origami Pulse" tinha cliente "Origami Lab LTDA",
estava **faturável** e sem centro próprio, com 135 lançamentos (130 h) no centro **SL03
Ventures**. O ADR-0035 já tinha posto `is_billable` e `cost_center_id` no projeto, o centro
"Projeto Interno" e o gatilho que leva a hora do projeto interno para o centro dele — mas o
Pulse nunca foi marcado, e o cliente obrigatório seguia exigindo um cliente fictício.

## Decisão

1. **Produto é projeto.** Sem tabela nova: `projects.is_internal_product`. Alocação, timesheet,
   kanban, sprints, releases, roadmap (marcos) e arquivos são os do projeto. A tela Produtos é
   uma visão de gestão por cima.
2. **Produto é sempre não faturável** (CHECK `projects_internal_product_not_billable`), logo tem
   centro de custo próprio pela regra que já existia (ADR-0035). Projeto interno pontual (sem
   ser produto) continua possível: não faturável, sem a marca, fora da tela Produtos.
3. **Cliente obrigatório só em projeto faturável** (CHECK `projects_billable_needs_client`,
   `client_id` passa a aceitar nulo). Projeto interno pode ter cliente — trabalho que o cliente
   não paga — ou não; produto não tem. Na interface, o lugar do cliente mostra o tipo
   ("Produto interno", "Projeto interno"), por uma regra só (`src/lib/projectKind.ts`).
4. **Tipo no formulário.** O antigo "Projeto interno, sem faturamento" virou o campo Tipo:
   projeto de cliente, projeto interno, produto interno. Produto esconde cliente e a aba
   financeira, chama o gerente de "Responsável pelo produto" e já sugere o centro Projeto Interno.
5. **Tela Produtos** (`/projetos/produtos`, capacidade nova `produto:ler`, espelhando
   `portfolio:ler`: Admin e Gerente). Uma RPC, `internal_products_overview()`, SECURITY DEFINER
   com tenant de `auth.uid()`, devolve por produto: responsável, equipe atual (alocados do mês em
   diante), horas investidas no total e no mês, custo das horas (só com `financeiro:ler`; nulo
   para os demais), desde quando, próximo marco aberto e última release. Agregado por produto: a
   tela não recebe hora nem custo por pessoa. "Novo produto" (com `projeto:editar`) abre o
   formulário já no tipo produto.
6. **Investimento desta versão = horas × custo-hora gravado no lançamento**, o mesmo custo
   realizado que o projeto já usa. Despesas do projeto (`project_costs`: infraestrutura,
   ferramentas) ficam para a próxima etapa: as regras de recorrência vivem no front e
   duplicá-las em SQL faria duas contas divergirem.
7. **O passado do Pulse é corrigido, não preservado.** Decisão do Italo: a classificação estava
   errada desde o início, então as 135 horas saem de SL03 Ventures para Projeto Interno. Não é o
   caso do ADR-0036 (configuração que muda com vigência): é correção de dado mal classificado.
   Cada hora movida fica em `timesheet_cost_center_corrections`, com o centro anterior, e o
   rollback devolve tudo por esse rastro.

## Consequências

- Benefícios: "quanto já investimos no Pulse" vira número visível; a margem de Ventures deixa
  de carregar um custo que não era dela, também no passado; o Harness entra pela tela, sem
  cliente fictício.
- Custos: 16 pontos do front assumiam projeto com cliente (dois `clients!inner` faziam o projeto
  sumir do timesheet sem erro) e 9 de exibição — todos corrigidos neste diff, mapeados por
  varredura. O projeto roda com `strictNullChecks` desligado, então o `tsc` não pega o próximo:
  quem ler `project.client` precisa tratar nulo.
- Riscos: relatórios já vistos de Ventures mudam (o custo do Pulse sai de lá). Na janela entre o
  `db push` do build e o front novo no ar, o front antigo esconderia o Pulse do timesheet — por
  isso a migration vai junto do deploy, não antes.
- Como reverter: `supabase/rollback/20261021140000_internal_products_rollback.sql` devolve o
  centro das horas pelo rastro, o cliente e a faturabilidade do Pulse, remove a marca, a
  capacidade e a RPC, e recoloca o `NOT NULL` do cliente.

## Evidências

- Leituras de produção em 21/10/2026 (`supabase db query --linked`, só leitura): Pulse com
  135 lançamentos travados, todos com custo-hora, todos em SL03 Ventures; nenhuma parcela;
  centro "Projeto Interno" presente; gatilhos de `projects` e `project_timesheets` sem trava de
  UPDATE nas colunas tocadas.
- Ensaio local da migration com stub (inclusive o id real do Pulse): Pulse vira produto não
  faturável, sem cliente e no centro Projeto Interno; 5 de 5 horas de teste movidas com rastro;
  hora de outro projeto intacta; CHECK recusa projeto faturável sem cliente e produto faturável;
  a RPC devolve custo para quem tem `financeiro:ler`, nulo para gerente sem ele e nada para quem
  não tem `produto:ler`; rollback e reaplicação.
- Mapa de impacto do `client_id` nulo: 16 pontos que quebravam, 9 de exibição, 21 que já
  tratavam; 0 em SQL e Edge Functions.
