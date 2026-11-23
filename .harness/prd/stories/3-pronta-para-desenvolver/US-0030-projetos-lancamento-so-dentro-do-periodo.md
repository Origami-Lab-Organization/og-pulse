# US-0030 — Lançar horas e custos só dentro do período do projeto

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 6
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0026, ADR-0038

## Descrição

**Como** GP ou admin,
**quero** que o Pulse recuse lançamentos de horas e de custos fora do período do projeto
ou em projeto concluído,
**para** que o custo do projeto só tenha o que de fato aconteceu durante a execução.

### Contexto

Hoje a regra existe só em parte, e só na tela:

- em projeto concluído, quem não é admin não edita custos, e a tela de horas não mostra
  projetos concluídos;
- o formulário de custo aceita qualquer data, antes do início ou depois do fim;
- nada no banco impede o lançamento, e as horas também podem ser lançadas pelo chat
  (MCP `log_project_hours`), que não passa pela tela.

Lançamento fora do período distorce o custo por mês e a margem, e no gráfico ele hoje
cai no mês errado (US-0026).

### Escopo

- Inclui: lançar, editar e apagar horas e custos (ledger da aba Despesas), pela tela e
  pelo chat; o aviso que a pessoa recebe quando a ação é recusada.
- Não inclui: lançamentos fora do período que já existem (continuam valendo e aparecem
  num mês extra do gráfico, US-0026); recebimento de parcelas (ADR-0038).

## Critérios de aceite

**Cenário 1: projeto concluído não recebe lançamento**

- **Dado** um projeto na etapa Concluído e uma pessoa que não é admin;
- **Quando** ela tenta lançar horas ou um custo nele;
- **Então** o lançamento é recusado;
- **E** ela vê que o projeto está concluído e por isso não aceita lançamentos.

**Cenário 2: em projeto concluído, também não se edita nem apaga**

- **Dado** um projeto na etapa Concluído e uma pessoa que não é admin;
- **Quando** ela tenta editar ou apagar uma hora ou um custo já lançado;
- **Então** a ação é recusada, com o mesmo aviso.

**Cenário 3: admin lança em projeto concluído**

- **Dado** um projeto na etapa Concluído e um admin;
- **Quando** ele lança, edita ou apaga uma hora ou um custo com data dentro do período;
- **Então** a ação é aceita.

**Cenário 4: data antes do início é recusada**

- **Dado** um projeto que começa em 19/10/2026;
- **Quando** alguém tenta lançar horas ou um custo com data 18/10/2026, ou mudar a data
  de um lançamento para 18/10/2026;
- **Então** a ação é recusada;
- **E** a pessoa vê o período aceito pelo projeto.

**Cenário 5: data depois do fim é recusada**

- **Dado** um projeto que termina em 17/11/2026;
- **Quando** alguém tenta lançar horas ou um custo com data 18/11/2026, ou mudar a data
  de um lançamento para 18/11/2026;
- **Então** a ação é recusada.

**Cenário 6: data dentro do período é aceita**

- **Dado** um projeto em andamento de 19/10/2026 a 17/11/2026;
- **Quando** alguém lança horas ou um custo em qualquer data de 19/10 a 17/11,
  incluindo as duas pontas;
- **Então** o lançamento é aceito.

**Cenário 7: para o custo, vale a data do custo**

- **Dado** um custo com data do custo dentro do período e data de pagamento depois do
  fim do projeto (ex.: hotel de 15/11 pago em 25/11, num projeto que termina em 17/11);
- **Quando** ele é lançado;
- **Então** o lançamento é aceito.

**Cenário 8: projeto sem data de fim**

- **Dado** um projeto contínuo ou sem data de fim;
- **Quando** alguém lança horas ou um custo com data a partir do início;
- **Então** o lançamento é aceito;
- **E** só a data antes do início é recusada.

**Cenário 9: o chat segue a mesma regra**

- **Dado** um lançamento de horas feito pelo chat;
- **Quando** o projeto está concluído ou a data está fora do período;
- **Então** o chat recusa e explica o motivo, como a tela.

## Decisões (Victor Couto, 23/11/2026)

- Não se lança em projeto concluído.
- Lançamentos só entre a data de início e a data de fim do projeto.
- O admin pode lançar, editar e apagar em projeto concluído.
- Para o custo, vale a data do custo; a data de pagamento pode ser depois do fim.
- Em projeto concluído, a regra vale também para editar e apagar.
- Projeto sem data de fim só tem o limite da data de início.

## Pontos em aberto

### Hipóteses para validar

- A exceção do admin vale só para a etapa Concluído; a regra do período vale para todos,
  inclusive o admin. Uma nota que chega depois tem data do custo dentro do período, então
  continua aceita (cenário 7).

### Provocações para produto

- Se o projeto atrasar e a pessoa precisar lançar horas depois da data de fim, ela vai
  ser recusada. O caminho esperado é o GP estender a data de fim antes; vale deixar isso
  claro na mensagem de recusa.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - `src/pages/ProjectDetail.tsx`: `canEdit = canManageProject && (isAdmin || !isCompleted)`
    e `canEditActuals` falso em projeto concluído, inclusive para o admin (só tela);
  - `src/hooks/useMyTimesheetData.ts` exclui projetos com `portfolio_stage = 'completed'`
    e lê `start_date`/`end_date` (só tela);
  - `ProjectCostFormDialog.tsx`: data do custo começa em hoje, sem limite de período;
  - MCP: `log_project_hours` em `apps/mcp-drive/src/index.ts` grava horas fora da tela.
  - NÃO LOCALIZADO: guarda no banco (trigger ou policy) por período ou por etapa em
    `project_timesheets` e `project_costs`.
- **Restrições:** a recusa precisa valer no banco, não só na tela, porque há dois
  caminhos de escrita (tela e MCP, TD-0022); "admin" é capacidade, não papel (ADR-0027):
  a exceção do cenário 3 deve seguir a capacidade que hoje libera editar projeto
  concluído; mensagem ao usuário com `ERRCODE 'PU001'` e `mensagemParaUsuario`
  (ai-review-checklist); mudança de schema só por migration.
- **Riscos para investigar:** "Limpar semana" e preenchimento automático de horas
  (`useTimesheetPrefill`); edição de horas pelo admin (`AdminWeekEditDialog`); lançamento
  gerado no fechamento de negócio (`useCloseBusinessDeal` grava em `project_costs`);
  custo recorrente (`start_month`/`end_month`) em vez de data única.
- **Provas esperadas:** os nove cenários, pela tela e pelo chat.
- **Fora do escopo:** limpar lançamentos fora do período que já existem.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
