# US-0041 — Tirar atividades da lista (ex.: holdings)

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0003, US-0010, US-0014, US-0042

## Descrição

**Como** pessoa do comercial,
**quero** tirar da lista as atividades com que a Origami não trabalha, como as holdings,
**para** não ver de novo, a cada busca, empresas que nunca vão virar conta.

### Contexto

Pedido do Victor (24/11/2026). Hoje os filtros de atividade (setor, ramo, CNAE) só **incluem**:
para tirar holdings, seria preciso marcar todos os outros ramos. Holdings estão no ramo 64
(serviços financeiros), sobretudo nos CNAEs 6462-0/00 (holdings de não financeiras) e 6463-8/00
(outras sociedades de participação); imobiliárias no ramo 68.

### Escopo

- Inclui: no filtro de atividade da Base, a opção de **tirar** setores, ramos e CNAEs (além de
  incluir), com o que está tirado à vista no painel.
- Inclui: um atalho **"Sem holdings"** (os CNAEs de holding e participações), e outros atalhos a
  decidir.
- Inclui: o mesmo na aba "Em qualificação" (US-0042).
- Inclui: o que está tirado fica guardado no navegador, como os outros filtros.
- Não inclui: descartar a empresa para o time (US-0010 já faz isso, uma a uma ou em lote).

## Critérios de aceite

**Cenário 1: tirar um ramo**

- **Quando** tiro o ramo 64;
- **Então** nenhuma empresa com CNAE principal no ramo 64 aparece, e o painel mostra "Sem: 64
  (Serviços financeiros)".

**Cenário 2: atalho de holdings**

- **Quando** uso "Sem holdings";
- **Então** saem as empresas com CNAE principal de holding ou participações.

**Cenário 3: incluir e tirar juntos**

- **Dado** o setor "Indústria" incluído;
- **Quando** tiro o ramo 10 (alimentos);
- **Então** vejo a indústria sem alimentos.

## Pontos em aberto

### Decisões pendentes

- **Tirar pela atividade principal só, ou também pela secundária?** Proposta: só pela principal
  (uma indústria com holding como secundária continua aparecendo).
- **Quais atalhos** além de "Sem holdings"? Sugestões: "Sem imobiliárias" (ramo 68), "Sem
  órgãos e associações" (natureza), "Sem SPEs" (pelo nome).
- **O atalho de holdings vale como padrão** para quem abre a tela pela primeira vez?

## Contexto técnico

- **Comportamento atual:** PROVADO — setores, ramos e CNAEs em `FiltrosReceita`
  (`src/types/filtrosReceita.ts`), condições de inclusão em `condicoes` da Edge Function
  `empresas-receita` (`atividade`), índices por `secao`, `divisao` e CNAE na VPS.
- **Mudanças:** listas de exclusão nos filtros, validadas como as de inclusão; condição
  `NOT (...)` com parâmetros; sem mudança no banco.
- **Riscos para investigar:** desempenho do `NOT` com os índices atuais na ordem por fit e por
  faturamento.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
