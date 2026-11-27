# US-0052 — Regularizar os clientes atuais, caso a caso

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2.2 do roadmap
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("vamos passar as ressalvas para estarem prontas")
- **Depende de:** US-0045, US-0050, US-0051
- **Relacionadas:** US-0045

## Descrição

**Como** admin,
**quero** que cada cliente atual fique ligado a exatamente uma empresa, decidido caso a caso,
**para** que a carteira e o histórico estejam certos quando o cadastro único entrar.

### Contexto

Decisão do Victor (24 e 25/11/2026): os registros atuais são tratados um de cada vez, porque
alguns podem ter sido clientes antes de a operação começar no Pulse, em 2026. Retrato da Origami
Lab em 25/11/2026 (leitura em produção):

| Caso | Hoje | O que fazer | Decisão |
|---|---|---|---|
| Bry Tecnologia | Ligado a duas empresas: "Bry" (sem CNPJ) e a de CNPJ 04.441.528/0001-57 | Manter a com CNPJ e levar para ela as Oportunidades, contatos e atividades da outra | aprovada |
| Syngularid | Ligado a duas empresas: "Syngular Id" (sem CNPJ) e a de CNPJ 27.637.943/0001-86 | Igual à Bry | aprovada |
| Prumo Engenharia | Sem ligação; há empresa de mesmo CNPJ | Ligar à empresa | aprovada |
| Tecno2000 | Sem ligação; há empresa de mesmo CNPJ | Ligar à empresa | aprovada |
| 99, Facilita Minas, P.IN, Integrar | Sem empresa; têm projeto | Criar a empresa com os dados do cliente e da Receita | aprovada |
| Injetoras NS | Sem empresa e sem CNPJ; projeto termina em 11/2026 | Criar a empresa pelo nome, sem CNPJ | aprovada |
| Gfsis, Rodosafra, Cosmex | Só orçamento, sem Ganho nem projeto | Não foram clientes: saem da carteira e ficam só como empresa, com os orçamentos | aprovada |
| Transportadora Cabral | Sem orçamento, Ganho nem projeto | Foi cliente em 2024: marca "Cliente antes do Pulse", 2024 (US-0051) | aprovada |
| UNIFOR-MG | CNPJ incompleto no cliente (20.501.128/0001-4); empresa sem CNPJ | Corrigir para 20.501.128/0001-46 (Fundação Educacional de Formiga, confirmado na Receita em 25/11/2026) e ligar | aprovada |
| BPA Ventures | Sem CNPJ; 1 Ganho e 1 projeto (Ventures) | Manter pelo nome, sem CNPJ | aprovada |
| Origami Lab LTDA | A própria Origami como cliente: 2 Ganhos, 1 projeto, 7 orçamentos | Fica como está, ligada à empresa Origami Lab; resolvida no épico 7 (projetos internos) | aprovada |

## Critérios de aceite

**Cenário 1: um cliente, uma empresa**

- **Dado** os clientes da Origami Lab em produção;
- **Quando** a regularização é aplicada;
- **Então** cada cliente que continua na carteira está ligado a exatamente uma empresa;
- **E** cada caso segue a decisão registrada na tabela;
- **E** Gfsis, Rodosafra e Cosmex deixam de ser clientes, com os orçamentos preservados.

**Cenário 2: nada se perde**

- **Dado** uma empresa juntada a outra (Bry, Syngularid);
- **Então** as Oportunidades, contatos, atividades, orçamentos e projetos dela aparecem na empresa
  que ficou.

## Decisões (Victor Couto, 25/11/2026)

- Tabela aprovada linha a linha, como acima.

## Contexto técnico

- **Comportamento atual:** PROVADO: retrato por consulta de leitura em produção, 25/11/2026.
- **Restrições:** regularização por migration versionada e idempotente, só no tenant da Origami,
  com rollback; aplicada depois das US-0045, US-0050 e US-0051.
- **Provas esperadas:** consulta depois da aplicação: todo cliente com uma empresa; contagens de
  Oportunidades, projetos e orçamentos iguais antes e depois.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
