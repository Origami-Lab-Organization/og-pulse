# ADR-0037 — Stakeholder pertence ao cliente; o projeto adiciona a leitura dele

- **Data:** 17/09/2026
- **Status:** aceita
- **Relacionadas:** [ADR-0031](0031-centro-de-custo-como-ancora-de-custo-e-receita.md) (carimbar na escrita), [ADR-0036](0036-configuracao-financeira-tem-vigencia-e-nao-reescreve-o-passado.md)

## Contexto

`project_stakeholders.project_id` era `NOT NULL`: a pessoa só existia dentro de um projeto.
Mas stakeholder é gente da organização do cliente. O patrocinador continua sendo o
patrocinador quando o projeto acaba, e é o mesmo em todos os projetos daquela conta.

A prova de que o modelo incomodava já estava no código: existe um diálogo inteiro,
"Importar stakeholders", cujo único trabalho é copiar as mesmas pessoas de um projeto do
cliente para outro. Copiar gente entre projetos do mesmo cliente é sintoma, não recurso.

O efeito prático era que abrir um cliente não respondia "quem são as pessoas dessa conta".
A resposta estava espalhada pelos projetos, repetida, e sumia quando o projeto era encerrado.

## Decisão

**A pessoa pertence ao cliente. O projeto adiciona a leitura que vale ali.**

`client_id` entra em `project_stakeholders` e `project_id` passa a aceitar `NULL`. Cada linha
responde a uma das duas perguntas:

| Linha | Significado |
|---|---|
| `project_id IS NULL` | A pessoa **na conta**. É o cadastro do cliente. |
| `project_id NOT NULL` | A mesma pessoa **naquele projeto**, com influência, interesse, patrocínio e ação próprios. |

**As quatro leituras são por projeto de propósito** — influência, interesse, patrocínio e
ação. Quem é promotor num projeto pode ser detrator no seguinte, e achatar isso numa ficha só
perderia justamente a informação que o GP usa para decidir como conduzir a conversa. O que a
conta guarda é a identidade: nome, cargo, papel, organização, e-mail, telefone, observações.

**O cliente é carimbado na escrita, não descoberto na leitura.** Um trigger preenche
`client_id` a partir do projeto quando a linha é de projeto — mesma ideia do centro de custo
na hora (ADR-0031). A aba do cliente lê `WHERE client_id = X` e enxerga os dois mundos numa
consulta, sem join.

**O que já existia foi promovido, não movido.** A migration
`20260917160000_stakeholder_de_projeto_sobe_para_o_cliente` cria a ficha de conta de cada
pessoa distinta (nome+e-mail) encontrada nos projetos do cliente, copiando a ficha mais
recente e deixando as quatro leituras de projeto vazias. As linhas de projeto ficam intactas:
o projeto pode ter gente que a conta não tem, e passa a poder puxar da conta.

**Uma linha sem dono nenhum não existe** — `CHECK (project_id IS NOT NULL OR client_id IS NOT
NULL)`, criado `NOT VALID` porque projeto interno pode não ter cliente e a linha dele já
existia assim.

## Consequências

**Ganhos**

- Abrir o cliente responde quem são as pessoas dele, com os projetos em que cada uma aparece.
- Cadastrar uma vez basta: a importação para um projeto passa a enxergar a ficha da conta.
- Encerrar um projeto não apaga a memória de quem é quem naquele cliente.

**Custos e riscos**

- **O nome da tabela ficou impreciso.** Continua `project_stakeholders` e agora guarda gente
  de cliente. Renomear custaria policies, índices, views e nove arquivos de frontend, sem
  mudar comportamento — fica registrado aqui e num comentário na migration.
- Quem ler a tabela assumindo `project_id NOT NULL` passa a ver linhas com nulo. As policies
  de RLS eram esse caso: todas exigiam um projeto, e linha de conta seria negada por todas —
  inclusive a de leitura, fazendo a aba nascer vazia **sem erro nenhum**. Cada uma ganhou o
  ramo da conta, governado por `cliente:editar` para escrita e por pertencer ao tenant para
  leitura.
- A deduplicação por nome+e-mail é heurística. Duas pessoas homônimas sem e-mail viram uma.
  Preferido a inventar identidade: o e-mail é o que o time já usa para distinguir, e a tela
  de projeto continua com as linhas separadas.

## Alternativas descartadas

**Tabela nova `client_stakeholders`.** Mesma forma, duas tabelas, e toda leitura que quisesse
"a pessoa" teria de unir as duas. A importação entre projetos continuaria existindo por fora.

**Mover tudo para o cliente e o projeto só referenciar.** Seria o modelo mais puro, mas
jogaria fora influência, interesse, patrocínio e ação por projeto, ou exigiria uma terceira
tabela de ligação com essas quatro colunas — um join a mais em toda tela de projeto para
resolver um problema que ninguém tem.
