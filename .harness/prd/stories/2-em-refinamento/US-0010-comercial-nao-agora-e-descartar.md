# US-0010 — Marcar "Não agora" ou descartar a empresa

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 4
- **Aprovada por / em:** —
- **Relacionadas:** US-0007, US-0011

## Descrição

**Como** pessoa do comercial,
**quero** tirar da lista as empresas que não quero abordar agora ou que não servem,
**para** não avaliar a mesma empresa duas vezes.

### Contexto

Sem registro da decisão, a mesma empresa volta para a lista de todo mundo, e o time
avalia de novo o que já foi descartado.

### Escopo

- Inclui: ação "Não agora" na linha e na ficha; ação "Descartar" na ficha, com motivo
  obrigatório; mensagem de confirmação com Desfazer.
- Não inclui: Perda de oportunidade, que continua no Pipeline com os motivos de perda
  atuais.

## Critérios de aceite

**Cenário 1: não agora**

- **Quando** marco "Não agora";
- **Então** a empresa sai de "A classificar" e vai para a aba "Não agora";
- **E** volta sozinha para "A classificar" depois de 90 dias, para todo o time.

**Cenário 2: descartar com motivo**

- **Quando** clico em "Descartar";
- **Então** escolho o motivo antes de confirmar, entre Sem fit, Já é cliente ou
  parceiro, Concorrente, Dados inválidos e Outro motivo;
- **E** "Outro motivo" pede um texto obrigatório;
- **E** a empresa some de "A classificar" para todo o time;
- **E** vai para a aba "Descartadas", com o motivo e quem descartou.

**Cenário 3: desfazer**

- **Dado** que tenho `prospeccao:editar`;
- **Quando** clico em Desfazer na mensagem ou na aba, mesmo num descarte de outra pessoa;
- **Então** a empresa volta para "A classificar" para todo o time.

## Decisões (Victor Couto, 2026-11-16)

- "Não agora" volta para "A classificar" depois de 90 dias.
- O descarte vale para o time inteiro, mostra quem descartou e o motivo, e qualquer
  pessoa com `prospeccao:editar` pode desfazer.
- Motivos do descarte: Sem fit, Já é cliente ou parceiro, Concorrente, Dados
  inválidos e Outro motivo, este com texto obrigatório. É uma lista própria, separada
  dos motivos de perda da oportunidade.

## Pontos em aberto

- 18/11/2026: a tela Empresas ficou sem abas (US-0008; US-0011 arquivada). Rever onde aparecem
  as empresas marcadas como "Não agora" ou descartadas, e se esta história ainda faz sentido.

### Provocações para produto

- Empresa descartada que muda de situação na Receita (entra no Lucro Real, troca de
  sócio) — impacto possível: oportunidade perdida se ela nunca mais aparecer. O
  `company-watch` só vigia empresas que já estão na Prospecção.

## Contexto técnico

- **Comportamento atual:** NÃO LOCALIZADO — não existe registro de classificação de
  empresa fora da Prospecção.
- **Restrições e padrões aplicáveis:** dado novo exige migration com RLS por tenant e
  capacidade — fonte: `../../../boundaries.md`, ADR-0023.
- **Riscos para investigar:** registro de classificação por empresa e por tenant;
  histórico de quem descartou.
- **Provas esperadas:** não agora, descartar com motivo, desfazer; RLS do registro.
- **Fora do escopo:** motivos de perda da oportunidade.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
