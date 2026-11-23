# US-0030 — Lançar horas e custos só dentro do período do projeto

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 6
- **Aprovada por / em:** —
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

- Inclui: lançamento de horas e de custos (ledger da aba Despesas), pela tela e pelo
  chat; o aviso que a pessoa recebe quando o lançamento é recusado.
- Não inclui: lançamentos fora do período que já existem (continuam valendo e aparecem
  num mês extra do gráfico, US-0026); recebimento de parcelas (ADR-0038).

## Critérios de aceite

**Cenário 1: projeto concluído não recebe lançamento**

- **Dado** um projeto na etapa Concluído;
- **Quando** alguém tenta lançar horas ou um custo nele;
- **Então** o lançamento é recusado;
- **E** a pessoa vê que o projeto está concluído e por isso não aceita lançamentos.

**Cenário 2: data antes do início é recusada**

- **Dado** um projeto que começa em 19/10/2026;
- **Quando** alguém tenta lançar horas ou um custo com data 18/10/2026;
- **Então** o lançamento é recusado;
- **E** a pessoa vê o período aceito pelo projeto.

**Cenário 3: data depois do fim é recusada**

- **Dado** um projeto que termina em 17/11/2026;
- **Quando** alguém tenta lançar horas ou um custo com data 18/11/2026;
- **Então** o lançamento é recusado.

**Cenário 4: data dentro do período é aceita**

- **Dado** um projeto em andamento de 19/10/2026 a 17/11/2026;
- **Quando** alguém lança horas ou um custo em qualquer data de 19/10 a 17/11,
  incluindo as duas pontas;
- **Então** o lançamento é aceito.

**Cenário 5: o chat segue a mesma regra**

- **Dado** um lançamento de horas feito pelo chat;
- **Quando** o projeto está concluído ou a data está fora do período;
- **Então** o chat recusa e explica o motivo, como a tela.

## Decisões (Victor Couto, 23/11/2026)

- Não se lança em projeto concluído.
- Lançamentos só entre a data de início e a data de fim do projeto.

## Pontos em aberto

### Decisões pendentes

- **Admin em projeto concluído:** hoje o admin ainda edita projeto concluído ("Apenas
  administradores podem realizar alterações"). A regra vale também para o admin, ou ele
  continua podendo lançar para corrigir, por exemplo, uma nota que chegou depois?
- **Qual data do custo conta:** o custo tem a data do custo e a data de pagamento. Uma
  nota de hotel da última semana costuma ser paga depois do fim do projeto. A regra vale
  para a data do custo (pagamento pode ser depois) ou para as duas?
- **Editar e apagar:** a regra vale também para editar ou apagar um lançamento que já
  existe em projeto concluído, ou só para lançar novo?
- **Projeto contínuo ou sem data de fim:** sem data de fim, vale só o limite do início?

### Provocações para produto

- Se o projeto atrasar e a pessoa precisar lançar horas depois da data de fim, ela vai
  ser recusada. O caminho esperado é o GP estender a data de fim antes; vale deixar isso
  claro na mensagem de recusa.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - `src/pages/ProjectDetail.tsx`: `canEdit = canManageProject && (isAdmin || !isCompleted)`
    e `canEditActuals` falso em projeto concluído (só tela);
  - `src/hooks/useMyTimesheetData.ts` exclui projetos com `portfolio_stage = 'completed'`
    e lê `start_date`/`end_date` (só tela);
  - `ProjectCostFormDialog.tsx`: data do custo começa em hoje, sem limite de período;
  - MCP: `log_project_hours` em `apps/mcp-drive/src/index.ts` grava horas fora da tela.
  - NÃO LOCALIZADO: guarda no banco (trigger ou policy) por período ou por etapa em
    `project_timesheets` e `project_costs`.
- **Restrições:** a recusa precisa valer no banco, não só na tela, porque há dois
  caminhos de escrita (tela e MCP, TD-0022); mensagem ao usuário com `ERRCODE 'PU001'` e
  `mensagemParaUsuario` (ai-review-checklist); mudança de schema só por migration.
- **Riscos para investigar:** "Limpar semana" e preenchimento automático de horas
  (`useTimesheetPrefill`); edição de horas pelo admin (`AdminWeekEditDialog`); lançamento
  gerado no fechamento de negócio (`useCloseBusinessDeal` grava em `project_costs`).
- **Provas esperadas:** os cinco cenários, pela tela e pelo chat.
- **Fora do escopo:** limpar lançamentos fora do período que já existem.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
