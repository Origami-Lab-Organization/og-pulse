# US-0036 — Metas de receita e margem bruta do portfólio

- **Status:** Pronto
- **Pronto em:** 27/11/2026, aprovado pelo Victor (PR #102 mesclado e testado por ele no localhost).
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Portfólio de projetos
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 23/11/2026 (pediu as US e o desenvolvimento da tela a partir do protótipo, versão 6)
- **Relacionadas:** US-0034, US-0031

## Descrição

**Como** admin,
**quero** definir a meta de receita do ano e a meta de margem bruta do portfólio, e ver o
portfólio contra elas,
**para** saber se o ano vai fechar no alvo.

### Escopo

- Inclui: tela Configurações › Metas do portfólio (por ano, só admin); barra da Receita
  esperada contra a meta do ano; card Margem bruta do portfólio em percentual, com a meta e
  quantos projetos estão na meta de margem deles.
- Não inclui: metas vindas da Estratégia (depois, quando ela estiver no Pulse).

## Critérios de aceite

- A Receita esperada mostra "meta R$ X · N% da meta", e a barra mede a receita esperada contra
  a meta.
- A Margem bruta do portfólio é (receita − custo projetado) ÷ receita dos projetos ativos
  (média ponderada pelo contrato), com a meta e o ponto de status: verde na meta, âmbar até
  10% da meta abaixo, vermelho abaixo disso.
- Só quem tem `configuracao:editar` define as metas.

## Decisões (Victor Couto, 23/11/2026)

- A meta de margem do portfólio é própria (o protótipo validado mostra meta própria), separada
  da meta de margem de cada projeto das configurações financeiras.

## Contexto técnico

- **Dados:** tabela nova `portfolio_goals` (tenant, ano, meta de receita, meta de margem bruta),
  por migration; leitura por `portfolio:ler`, escrita por `configuracao:editar` (já é a
  capacidade das configurações financeiras; não nasce capacidade nova).
- **Margem do portfólio:** não existe agregação no banco. A v1 calcula cada projeto ativo
  no cliente com a mesma regra da aba Financeiro (US-0025/US-0026/US-0031): mesmo número,
  mais consultas. Registrar dívida técnica e sugerir ADR para uma agregação no banco.
- **Teste local:** a 8080 usa o banco de produção, e a migration só é aplicada no deploy. Até
  lá, os cards mostram "Meta não definida" e salvar metas falha.
