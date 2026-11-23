# US-0016 — Classificar a conta como Âncora, Ponte ou Satélite

- **Status:** Arquivada
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0003, US-0006, US-0008, US-0017
- **Motivo do arquivamento:** incorporada à US-0008 ("Colocar empresas para abordar") em 2026-11-18, depois da validação da tela pelo Victor.

## Descrição

**Como** pessoa do comercial,
**quero** classificar a empresa como Âncora, Ponte ou Satélite quando decido abordá-la,
**para** que o time saiba que papel aquela conta tem na receita da Origami.

### Contexto

A Origami separa as contas em três tipos, com papéis diferentes na receita (material
"Projetos · Empresas de base", linha 1 de 3):

| | Âncora | Ponte | Satélite |
|---|---|---|---|
| Quem é | Acima de R$ 300 mi, de base | De R$ 100 a 300 mi | De R$ 10 a 100 mi |
| Contrato | Fases de 6 meses, renovadas todo ano | Fases de 6 a 12 meses, parcela menor | 6 meses ou mais; piloto em 2027 |
| Papel | Motor da receita: cresce a cada fase | Renova devagar; pode virar Âncora | Escala com uma dupla agêntica |
| Ticket | R$ 40 a 60 mil por mês | R$ 15 a 30 mil por mês | R$ 7 mil por mês |
| Limite | A maior parte da receita | Até 25% do Studio | 3 no piloto; portão em junho de 2027 |
| Hoje | Prumo, Tecno2000 e 99 | Bry e Syngular | Retífica, Sindinova, Avante, Cabral |

O tipo substitui o Tier da empresa (US-0017).

### Escopo

- Inclui: ao abrir oportunidade (US-0008), a tela sugere o tipo pelo faturamento
  estimado e a pessoa confirma ou troca; o tipo fica guardado na empresa, num campo
  próprio com lista fechada; aparece e pode ser editado na ficha da empresa; vira filtro
  na aba "Na Prospecção"; o filtro de faturamento da base usa as mesmas faixas (entra na US-0006,
  decisão de 2026-11-17).
- Não inclui: limites por tipo (como "3 Satélites no piloto"); ticket ou contrato
  calculados a partir do tipo.

## Critérios de aceite

**Cenário 1: sugestão pelo faturamento**

- **Dado** uma empresa com faturamento estimado de R$ 150 mi;
- **Quando** abro a oportunidade pela ficha;
- **Então** o tipo vem sugerido como Ponte;
- **E** posso trocar para Âncora ou Satélite antes de confirmar.

**Cenário 2: sem faturamento estimado**

- **Dado** uma empresa sem faturamento estimado;
- **Então** o tipo não vem sugerido;
- **E** "Abrir oportunidade" só fica disponível depois que a pessoa escolhe o tipo.

**Cenário 2b: botão rápido sem sugestão**

- **Dado** uma empresa sem tipo sugerido;
- **Quando** clico no botão rápido de abrir oportunidade na linha;
- **Então** a ficha abre para eu escolher o tipo, em vez de abrir a oportunidade direto.

**Cenário 3: abaixo de R$ 10 mi**

- **Dado** uma empresa com faturamento estimado abaixo de R$ 10 mi;
- **Então** o tipo não vem sugerido;
- **E** a tela avisa que a empresa está abaixo da faixa de Satélite.

**Cenário 4: filtro de faturamento**

- **Então** o filtro de faturamento da base tem as faixas: abaixo de R$ 10 mi,
  Satélite (R$ 10 a 100 mi), Ponte (R$ 100 a 300 mi) e Âncora (acima de R$ 300 mi).

**Cenário 5: na Prospecção**

- **Dado** uma conta com tipo definido;
- **Então** vejo o tipo na lista e na ficha da conta;
- **E** posso filtrar a aba "Na Prospecção" por tipo e editar o tipo na ficha.

## Decisões (Victor Couto, 2026-11-16)

- A tela sugere o tipo pelo faturamento estimado e a pessoa confirma ou troca.
- O tipo fica na empresa, em campo próprio com lista fechada.
- O filtro de faturamento usa as faixas do tipo de conta, e não mais as do BNDES.
- O tipo substitui o Tier.
- O tipo de conta é obrigatório ao abrir a oportunidade.

## Pontos em aberto

### Provocações para produto

- O faturamento estimado é uma faixa de 40% para cada lado — impacto possível: empresa
  perto de R$ 100 mi ou R$ 300 mi recebe sugestão que muda conforme o valor do meio.

## Contexto técnico

- **Termos do domínio:** tipo de conta (novo no glossário); faturamento estimado
  (US-0006).
- **Comportamento atual:** PROVADO — `prospect_companies.tier` é texto livre e entra
  como faceta em `COMPANY_FACETS` (`src/lib/prospecting/companyList.ts`); o MCP da
  Prospecção também lê e grava o Tier.
- **Restrições e padrões aplicáveis:** campo novo com migration e RLS da empresa —
  fonte: `../../../boundaries.md`; escrita também no MCP (TD-0022); faixas com moeda
  truncada (ADR-0011).
- **Provas esperadas:** sugestão em cada faixa e nos limites de R$ 10, 100 e 300 mi;
  sem faturamento; edição na ficha; filtro.
- **Fora do escopo:** regras de limite por tipo.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
