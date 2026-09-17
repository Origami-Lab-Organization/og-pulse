# ADR-0036 — A configuração financeira tem vigência e não reescreve o passado

- **Data:** 17/09/2026
- **Status:** aceita
- **Contexto de origem:** PUL-260
- **Relacionadas:** [ADR-0011](0011-currency-truncation-no-rounding.md) (truncar, não arredondar), [ADR-0018](0018-alocacao-gpo-pro-rata-por-dias-uteis.md) (base inclui desalocado), [ADR-0031](0031-centro-de-custo-como-ancora-de-custo-e-receita.md)

## Contexto

`financial_settings` guardava **uma linha por empresa**, com `tenant_id UNIQUE`, editada por
cima. Os cinco percentuais que ela carrega — despesas administrativas, impostos, comissão
máxima, margem líquida e meta de margem bruta — são política financeira, não dado
operacional: mudam quando a empresa decide mudar, e a decisão tem data.

Editar por cima significava que mudar a meta de margem bruta em setembro passava a julgar um
projeto de janeiro pela meta de setembro. O veredito de margem de um período fechado mudava
sem que nada tivesse acontecido naquele período. Também não sobrava registro de quem mudou,
quando, nem do que valia antes — e a conversa "por que este projeto aparecia no verde em
março e agora aparece no vermelho" não tinha como ser respondida.

O orçamento já era imune, e por um bom motivo: `budgets` grava o **snapshot** dos percentuais
na própria linha desde a criação da tabela. Quem escreveu aquilo já sabia que preço proposto
não pode mudar depois. O que faltava era a mesma ideia valendo para o resto.

## Decisão

**A tabela vira o histórico.** Cada linha de `financial_settings` é uma **versão** com o dia
em que passa a valer (`effective_from`), quem gravou (`created_by`) e quando gravou
(`created_at`, que já existia). A restrição de unicidade deixa de ser `(tenant_id)` e passa a
ser `(tenant_id, effective_from)`.

**Ler a configuração é sempre ler por data.** Não existe mais "a configuração da empresa":
existe "a configuração que valia em D", que é a versão de maior `effective_from` não
posterior a D. No banco isso é `public.financial_settings_at(tenant, data)`; no cliente é
`versaoVigenteEm(versoes, data)`.

**A data de referência é de quem pergunta**, e cada tela responde a uma pergunta diferente:

| Quem lê | Data de referência | Porque |
|---|---|---|
| Abas de um projeto | data de início do projeto | é a política que o projeto assinou |
| Financeiro, Saúde e Analytics por período | fim do período analisado | é a meta contra a qual o período é julgado |
| Evolução mensal | fim de cada mês | a linha de meta pode ter degrau, e isso é o certo |
| Simulação de alocação (SQL) | hoje | a decisão que ela apoia é de hoje |
| Orçamento | hoje, para pré-preencher | o valor definitivo vira snapshot no próprio orçamento |

**Vigência é data, não timestamp.** Percentual de markup não muda de manhã para a tarde, e
comparar data cheia tira o fuso da conta. A data/hora da **alteração** continua em
`created_at`, que responde outra pergunta: uma diz desde quando vale, a outra quando foi
decidido. As duas aparecem no histórico, em colunas separadas, porque o caso interessante é
justamente o de alguém decidir hoje uma política que só vale em outubro.

**Salvar duas vezes no mesmo dia corrige a versão daquele dia**, em vez de criar duas
concorrentes. Quem errou o número às 9h e arrumou às 10h queria uma política, não duas.

**Não existe exclusão.** Corrigir é gravar outra versão.

## Consequências

**Ganhos**

- Período fechado para de mudar de resposta. O que estava no verde continua no verde.
- A pergunta "quem mudou isso, e desde quando?" passa a ter resposta na tela.
- Política pode ser decidida com antecedência: dá para cadastrar em setembro a regra que
  entra em outubro, e ela entra sozinha.

**Custos e riscos**

- Quem ler a tabela direto com `.maybeSingle()` quebra. Era o caso de quatro hooks, todos
  corrigidos; **este é o defeito a procurar primeiro** se algo relacionado a margem aparecer
  quebrado. Em plpgsql é pior: `SELECT INTO` com várias linhas pega uma em silêncio, que foi
  o caso de `simulate_allocation_margin_impact`.
- Empresa sem versão anterior à data perguntada recebe **nada**, não a versão mais antiga.
  É proposital: quem pergunta pela meta de um mês anterior à primeira configuração da
  empresa não tinha meta, e inventar uma seria pior do que não ter. Quem chama decide o
  default — hoje todos usam `null`, que a tela já sabe exibir.
- A linha que já existia em cada tenant foi retroagida a `1900-01-01`, então nenhum número
  visível mudou no dia da migração. Essa data-sentinela vai aparecer no histórico dessas
  empresas, e é honesta: ninguém sabe desde quando aquela política valia.

## Alternativas descartadas

**Tabela de auditoria separada (`financial_settings_history`).** Dá o histórico, mas não dá a
leitura por data: a tabela principal continuaria tendo uma linha só, e o passado continuaria
sendo reescrito. Resolveria a metade menos importante do problema.

**Snapshot no projeto, como o orçamento faz.** Congelaria a política no projeto, o que resolve
o projeto mas não resolve análise por período nem permite política futura — e multiplicaria
cinco colunas por tabela que precisasse do número.

**Vigência com início e fim (`valid_from`, `valid_to`).** Duas datas por linha que precisam
concordar entre si, com o risco clássico de buraco e de sobreposição. Com só `effective_from`,
a versão vale até a próxima existir, e não há estado inconsistente possível.
