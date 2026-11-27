# US-0052 — Regularizar os clientes atuais, caso a caso

- **Status:** Pronto
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

## Decisões (Victor Couto, 27/11/2026)

O retrato de 27/11/2026, por nome além da ligação, mostrou empresas que o de 25/11 não via:

1. **Facilita Minas, Integrar e Injetoras NS já tinham empresa**, de mesmo nome, sem CNPJ, solta e
   com o Ganho delas: liga a existente (com o CNPJ do cadastro, quando há) em vez de criar outra.
   Só a 99 e a P.IN ganham empresa nova.
2. **Cópias sem CNPJ fora da tabela são juntadas, como Bry e Syngularid:** LaudoAssist em Laudo
   Assist, Retífica Formiguense em Retifica Formiguense e Kione (sem CNPJ) em Kione (Cosmex).
3. **A Base concorda com a carteira:** "Já foi cliente" vem de Ganho, projeto ou "Cliente antes do
   Pulse"; estar no cadastro de clientes não basta. Sem isso, Gfsis, Rodosafra e Cosmex seguiriam
   "Já foi cliente" na Base.
4. **GFSIS e Rodosafra recebem o CNPJ do cadastro** (o da Rodosafra é de filial) e continuam só
   empresa, fora da carteira.

## Contexto técnico

- **Comportamento atual:** PROVADO: retrato por consulta de leitura em produção, 25/11/2026.
- **Restrições:** regularização por migration versionada e idempotente, só no tenant da Origami,
  com rollback; aplicada depois das US-0045, US-0050 e US-0051.
- **Provas esperadas:** consulta depois da aplicação: todo cliente com uma empresa; contagens de
  Oportunidades, projetos e orçamentos iguais antes e depois.

## Implementação

- **Migration** `supabase/migrations/20261127140000_regularizar_os_clientes.sql`, aplicada em
  produção em 27/11/2026: só o tenant da Origami, por id, idempotente, com rollback em
  `supabase/rollback/20261127140000_regularizar_os_clientes_rollback.sql` (ensaiado em produção numa
  transação desfeita). Confere na mesma transação as contagens e "um cliente, uma empresa".
- **Edge Function** `empresas-receita` (`_shared/relacao.ts`), publicada em 27/11/2026: o cadastro de
  clientes só liga os projetos à raiz do CNPJ.
- **Cidade** (pedido do Victor ao conferir, 27/11/2026): na aba Clientes e em toda a Prospecção, a
  cidade sai como "Cidade · UF" com o nome do IBGE, acentuado (`src/lib/prospecting/cidade.ts`),
  inclusive os 18 municípios que a Receita grafa pelo nome antigo.
- **Receita** das empresas que ganharam CNPJ (99, P.IN, Facilita Minas, Integrar, UNIFOR-MG, GFSIS,
  Rodosafra) consultada pela Prospecção depois da migration.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1. Um cliente, uma empresa | Consulta em produção depois da aplicação: os 21 clientes com Ganho, projeto ou "Cliente antes do Pulse" têm exatamente uma empresa; Gfsis, Rodosafra e Kione (Cosmex) sem Ganho nem projeto, com os orçamentos |
| 2. Nada se perde | Contagens iguais antes e depois, conferidas na transação: 148 Oportunidades, 366 contatos, 32 projetos, 34 orçamentos; as Oportunidades e os contatos das cópias estão na empresa que ficou |
