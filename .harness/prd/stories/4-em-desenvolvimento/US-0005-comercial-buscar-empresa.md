# US-0005 — Buscar empresa por nome, CNPJ ou cidade

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 2026-11-17
- **Relacionadas:** US-0001, US-0002, US-0003, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** buscar uma empresa pelo nome, pelo CNPJ ou pela cidade,
**para** achar uma conta específica que alguém me indicou.

### Contexto

Os filtros da US-0003 servem para chegar a um perfil de empresa. Mas quem recebe uma
indicação ("fala com a Fulana da Metalúrgica X, em Formiga") quer ir direto àquela conta.
Hoje isso não é possível: só dá para navegar pela lista ordenada.

### Escopo

- Inclui uma caixa de busca na barra da lista, ao lado do total, com o texto "Buscar por
  nome, CNPJ ou cidade".
- Inclui busca por **nome**: parte da razão social ou do nome fantasia, a partir de 3 letras,
  sem diferenciar maiúsculas nem acentos.
- Inclui busca por **cidade**: o nome inteiro da cidade, sem diferenciar acentos (ex.:
  "Formiga", "sao paulo"). As empresas da cidade aparecem junto com as que têm o termo no
  nome.
- Inclui busca por **CNPJ**, com ou sem pontuação, a partir de 5 números:
  - de 5 a 13 números mostram as empresas cujo CNPJ começa com eles (os 8 da raiz acham a
    matriz);
  - os 14 dígitos de uma matriz mostram a matriz;
  - os 14 dígitos de uma filial mostram a matriz dela, com aviso.
- Inclui: a busca por nome ou cidade respeita os filtros ativos; a busca por CNPJ os ignora
  e avisa.
- Inclui: a lista segue a ordenação escolhida na tabela; a busca volta para a página 1.
- Inclui: o "x" da caixa limpa a busca; "Limpar" do painel zera só os filtros.
- Inclui: a busca fica guardada no navegador entre visitas, como os filtros.
- Não inclui: busca por nome de sócio; filtro de cidade no painel; destacar o termo na lista.

## Critérios de aceite

**Cenário 1: por nome**

- **Dado** que digito "usiminas";
- **Então** a lista mostra as empresas com "usiminas" na razão social ou no nome fantasia,
  sem diferenciar maiúsculas nem acentos;
- **E** o total mostra quantas são.

**Cenário 2: termo curto**

- **Dado** que digito só "ab", ou só "1746";
- **Então** a lista continua como estava;
- **E** a caixa avisa, dentro dela, "Digite ao menos 3 letras" ou "Digite ao menos 5 números
  do CNPJ".

**Cenário 3: por cidade**

- **Quando** digito "formiga";
- **Então** a lista mostra as empresas da cidade de Formiga e também as que têm "formiga"
  no nome;
- **Quando** digito "sao";
- **Então** a lista não traz as empresas de São Paulo só por causa da cidade, porque o termo
  não é o nome inteiro de uma cidade.

**Cenário 4: por CNPJ**

- **Quando** digito o CNPJ de uma matriz da base, com ou sem pontuação;
- **Então** a lista mostra só essa empresa.

**Cenário 5: CNPJ de filial ou começo do CNPJ**

- **Quando** digito o CNPJ de uma filial;
- **Então** a lista mostra a matriz;
- **E** avisa "Mostrando a matriz desta filial";
- **Quando** digito só o começo do CNPJ, de 5 a 13 números (ex.: "17.469");
- **Então** a lista mostra as empresas cujo CNPJ começa com eles.

**Cenário 6: CNPJ fora da base**

- **Quando** digito o CNPJ de uma empresa que não está na base (ME, EPP, inativa, ou órgão
  público, entre outros);
- **Então** vejo "Esse CNPJ não está na base", com o motivo do recorte: só matrizes ativas,
  fora ME e EPP;
- **E**, se digitei só o começo, vejo "Nenhum CNPJ da base começa com esses números".

**Cenário 7: CNPJ ignora os filtros**

- **Dado** filtros ativos;
- **Quando** digito o CNPJ de uma empresa da base que não atende aos filtros;
- **Então** a lista mostra essa empresa;
- **E** avisa que os filtros foram ignorados nesta busca.

**Cenário 8: nome com filtros**

- **Dado** filtros ativos;
- **Quando** busco pelo nome uma empresa que não atende aos filtros;
- **Então** vejo o estado vazio "Nenhuma empresa com esses filtros", com a opção de limpar
  os filtros.

**Cenário 9: limpar a busca**

- **Dado** uma busca ativa;
- **Quando** clico no "x" da caixa ou apago o texto;
- **Então** a lista volta a mostrar as empresas dos filtros, na página 1.

**Cenário 10: a busca fica guardada**

- **Dado** uma busca feita;
- **Quando** saio da tela e volto;
- **Então** a caixa e a lista continuam com a mesma busca.

## Decisões (Victor Couto, 2026-11-16 e 2026-11-17)

- CNPJ na busca ignora os filtros e avisa (16/11).
- A cidade fica na mesma caixa da busca, não no painel (17/11).
- CNPJ de filial leva à matriz; os 8 primeiros dígitos também acham a empresa (17/11).
- A busca segue a ordenação escolhida na tabela, sem ordem por relevância (17/11).
- A busca por nome usa índice de texto na VPS (`pg_trgm`), ligado uma vez pelo
  administrador do banco (17/11).
- A cidade só entra quando o termo é o nome inteiro dela: "são" não traz as 270 mil
  empresas de São Paulo (17/11, na aprovação).
- Depois da validação da tela (17/11): CNPJ a partir de 5 números, pelo começo; a busca fica
  guardada entre visitas, como os filtros; o aviso de texto curto fica dentro da caixa.

## Pontos em aberto

### Hipóteses para validar

- 3 letras como mínimo bastam para o time. Origem: o índice de texto trabalha com trechos
  de 3 letras.
- Texto só de números é sempre CNPJ: um nome só de números (ex.: "2000") não é achado pela
  busca. Origem: o pedido de busca a partir de 5 números.

### Provocações para produto

- Cidades com o mesmo nome em estados diferentes (ex.: "Bom Jesus", em 5 estados) aparecem
  juntas. O filtro de Estado resolve — impacto possível: confusão até a pessoa marcar o
  estado.
- Nome de cidade que também é palavra comum (ex.: "Formiga", "Palmas") traz empresas das
  duas origens — impacto possível: lista maior que o esperado; o filtro de Estado ajuda.

## Contexto técnico

- **Objetivo observável:** a Edge Function `empresas-receita` aceita um termo de busca nos
  modos página e total, e a tela manda o termo junto dos filtros.
- **Termos do domínio:** matriz, filial, raiz do CNPJ (`cnpj_basico`), recorte da base.
- **Comportamento atual:** PROVADO (medição de 17/11/2026 na VPS, base de 2.438.184
  empresas):
  - não há índice de texto: `razao_social ILIKE '%usiminas%' OR nome_fantasia ILIKE …`
    leva 1,6 s, porque lê a tabela inteira; lista e total somam cerca de 3 s;
  - `pg_trgm` e `unaccent` estão disponíveis na imagem, mas não instalados; `pulse_carga`
    não pode criar extensão;
  - razão social, nome fantasia e cidade vêm em maiúsculas; só 7 razões sociais têm acento
    e nenhuma cidade tem; 828 mil empresas têm nome fantasia; são 5.290 cidades;
  - não há índice em `municipio`: contar as 890 de Formiga levou 0,45 s;
  - a tabela ocupa 746 MB, e 1,8 GB com os índices.
- **Comportamento esperado:**
  - a carga grava `nome_busca` (razão social + nome fantasia, em minúsculas e sem acento,
    pela mesma função de normalização da Edge Function) e `municipio_busca`;
  - índice GIN `gin_trgm_ops` em `nome_busca` e índice comum em `municipio_busca`;
  - nome e cidade viram `(nome_busca LIKE '%termo%' OR municipio_busca = termo)`, somado
    aos filtros;
  - CNPJ: 14 dígitos procuram `cnpj_basico` (filial → matriz); de 5 a 13, o intervalo
    `cnpj >= começo AND cnpj < começo + 1`, que usa a chave primária (o `LIKE` não usa, pela
    collation `en_US`: 3,3 s contra 26 ms); a tela compara o CNPJ achado para avisar filial;
  - o termo escapa `%` e `_` e vai como parâmetro;
  - meta: lista e total abaixo de 1 s, como na US-0003.
- **Superfícies conhecidas:**
  - `scripts/receita/vps/esquema.sql`: colunas e índices;
  - `scripts/receita/vps/configurar-vps.sh`: `CREATE EXTENSION pg_trgm` como administrador;
  - `scripts/receita/sincronizar-base.ts`: normalização na carga;
  - `supabase/functions/empresas-receita/index.ts`;
  - `src/hooks/useEmpresasReceita.ts`;
  - `src/components/prospeccao/receita/EmpresasDaReceita.tsx`;
  - `src/lib/prospecting/filtrosReceita.ts`: normalização compartilhada, se couber.
- **Restrições e padrões aplicáveis:**
  - SQL só com parâmetros; entrada validada (termo até 100 caracteres) — fonte:
    `.harness/boundaries.md`;
  - debounce de 300 ms, igual ao campo de CNAE da US-0003;
  - tokens do tema; caixa com rótulo acessível; avisos com `aria-live` — fonte:
    `.harness/patterns/design-system.md`.
- **Riscos para investigar:**
  - o índice de trigramas em 2,4 milhões de nomes pode passar de 300 MB e alongar a carga;
    medir na primeira carga;
  - termos muito comuns ("ltda", "comercio") casam com quase tudo; o total já para em
    "mais de 100.000".
- **Provas esperadas:**
  - ensaio da Edge Function: nome, cidade, CNPJ com e sem pontuação, filial, raiz, fora da
    base, termo curto e termo com `%`;
  - medição de tempo na VPS com e sem filtros;
  - validação da tela pelo Victor.
- **Fora do escopo:** busca por sócio; filtro de cidade no painel; relevância.

## Implementação

Ensaio de 17/11/2026: a Edge Function rodando no Deno contra a base real da VPS
(`pulse_api`, TLS conferido), com sessão simulada. Tempos da chamada inteira.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | "usiminas": 12 empresas, 59 ms; "fábrica de móveis" e "fabrica de moveis": as mesmas 14 |
| 2 | "ab": 400 "Digite ao menos 3 letras"; "1746": 400; a tela não manda termo curto e mostra o aviso dentro da caixa (`CaixaDeBusca`) |
| 3 | "formiga": 1.000 (890 da cidade e as com o termo no nome), 902 com MG; "sao": 44.969, sem a cidade inteira; "são paulo": mais de 100 mil |
| 4 | "60.894.730/0001-05" e "60894730000105": a matriz, 42 ms |
| 5 | "60.894.730/0002-88" e "60894730": a matriz; aviso de filial por `buscouFilial`; "17469" e "17.469": 17 empresas, 45 ms; "174697010": a ArcelorMittal; "99999" (sem teto) responde |
| 6 | "11.111.111/0001-11": lista vazia e total 0; a tela mostra "Esse CNPJ não está na base" |
| 7 | CNPJ com setor A e AC marcados: a matriz aparece; a tela avisa que os filtros foram ignorados |
| 8 | "usiminas" com setor A e AC: lista vazia; a tela mostra o estado com "Limpar filtros" |
| 9 | "x" e Esc limpam a caixa e voltam à página 1 (`CaixaDeBusca`, `EmpresasDaReceita`) |
| 10 | `guardarBusca` e `buscaDoNavegador`, chave `pulse:empresas-receita:busca:v1` |
| — | Recusas: número, texto acima de 100 caracteres e sem permissão (403); `%`, `_` e aspas valem como texto |
| — | Desempenho na VPS: lista entre 16 e 500 ms; total até 1,35 s só para termo muito comum ("sao", "comercio") |

- **VPS:** `pg_trgm` criado pelo administrador; `esquema.sql` aplicado como `pulse_carga`
  sobre a carga atual (índice de nome com 183 MB, 93 s), em 17/11/2026.
- **Edge Function:** publicada em 17/11/2026; a busca é opcional, a tela anterior segue igual.
- **Tela:** validada pelo Victor em 17/11/2026 (nome, cidade, filial, filtros); pediu CNPJ a
  partir de 5 números, busca guardada e respiro no aviso, ajustados e publicados no mesmo dia.
- **Ajustes:** conferidos na tela pelo Victor em 17/11/2026.
