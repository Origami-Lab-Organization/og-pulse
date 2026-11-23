# US-0037 — Sino de pendências no card e pendências na Visão Geral

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Portfólio de projetos
- **Prioridade:** 4
- **Aprovada por / em:** Victor Couto, 23/11/2026 (pediu as US e o desenvolvimento da tela a partir do protótipo, versão 6)
- **Relacionadas:** US-0035, US-0036

## Descrição

**Como** GP,
**quero** ver num sino com número, no canto do card, que o projeto tem algo fora do planejado
ou pedindo minha atenção, e encontrar essas pendências no topo da Visão Geral do projeto,
**para** agir sem precisar de legenda.

### Escopo

- Inclui: sino com bolinha vermelha e número no canto superior direito do card (só quando há
  pendência); painel "Pendências e decisões" no topo da Visão Geral, com a ação de cada item;
  ordem na coluna: quem tem pendência primeiro.
- Pendências disponíveis hoje: parcela vencida; planejamento parado há mais de 30 dias;
  projeto depois da data de fim sem concluir; margem projetada fora da meta do projeto
  (âmbar até 10% abaixo, vermelho abaixo disso, como o card Forecast da US-0032).
- Não inclui: renovação, entregáveis de encerramento e aprovação de planejamento (entram com
  as histórias dessas telas).

## Decisões (Victor Couto, 23/11/2026)

- Sem legenda, sem bordas coloridas e sem selos: o sino com número basta.
- Visão Geral do projeto: os cards de Receita, Comissão, Custos e Margem logo abaixo das abas;
  embaixo, Informações financeiras à esquerda e Pendências e decisões à direita. Sai o card
  "Informações do Projeto" (cliente, GP e período já estão no cabeçalho).
- A faixa vermelha de parcelas sai da Visão Geral: a parcela vencida já está nas pendências, e
  a NF com janela de emissão aberta passa a ser uma pendência também.
- Abaixo das duas colunas, "Equipe em {mês}": quem está ativo no projeto no mês atual (horas
  planejadas ou lançadas), em blocos lado a lado (4 por linha no MacBook 14", sem rolagem) com
  foto, nome e cargo — a ideia é mostrar a equipe, não as horas. Identidade vem do diretório de
  funcionários (PUL-162), então o membro também vê os colegas. Embaixo, discreto, "Xh de Yh no
  mês" e "abaixo do esperado" quando o lançado fica abaixo de 90% do planejado proporcional aos
  dias úteis já passados (faixa da Alocação GPO, ADR-0018). GP, gerente e admin
  (`financeiro:ler`) veem as horas de todos; o membro, só as próprias. Sem custo nem custo/hora.
  "Ver equipe" abre a aba Equipe.
