# US-0041 — Tirar atividades da lista (ex.: holdings)

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 24/11/2026 (refinamento aprovado no pedido "refine a 40, 41 e 42 para desenvolvermos elas"; testes aprovados)
- **Relacionadas:** US-0003, US-0010, US-0014, US-0040, US-0042

## Descrição

**Como** pessoa do comercial,
**quero** tirar da lista as atividades com que a Origami não trabalha, como as holdings,
**para** não ver de novo, a cada busca, empresas que nunca vão virar conta.

### Contexto

Pedido do Victor (24/11/2026). Hoje os filtros de atividade (setor, ramo, CNAE) só **incluem**:
para tirar holdings, seria preciso marcar todos os outros ramos.

Na Base (24/11/2026, 2,44 milhões de empresas):

| Atividade | Pela principal | Só pela secundária |
|---|---|---|
| Holdings (CNAEs 6462-0/00 e 6463-8/00) | 196 mil (8%) | 105 mil |
| Ramo 64 (serviços financeiros) inteiro | 257 mil | — |
| Ramo 68 (atividades imobiliárias) | 123 mil | — |

A tela abre filtrada em Indústria (seção C), onde holdings não entram pela principal. Elas
aparecem quando a pessoa tira o filtro de setor, escolhe outro setor ou liga "incluir atividade
secundária".

### Escopo

- Inclui: nos grupos **Setor**, **Ramo** e **CNAE** do painel de filtros da Base, a escolha
  **"Incluir | Tirar"** no próprio grupo (revisto pelo Victor no teste de 24/11/2026: não é um
  grupo separado). Em "Tirar", o Ramo lista todos os ramos, de qualquer setor. O título do grupo
  mostra o incluído e o tirado: "Indústria · sem Agropecuária"; "64 (Serviços financeiros)".
- Inclui: **atalhos** em chips, no grupo Ramo, em "Tirar":
  - **"Sem holdings"** — CNAEs 6462-0/00 e 6463-8/00;
  - **"Sem imobiliárias"** — ramo 68.
- Inclui: tirar vale **só pela atividade principal**, mesmo com "incluir atividade secundária"
  ligado (uma indústria com holding como secundária continua aparecendo).
- Inclui: o mesmo item não fica nos dois lados: escolher "tirar" um item incluído o tira da
  inclusão, e vice-versa.
- Inclui: a contagem de filtros e o resumo do grupo contam o que está tirado; "Limpar" limpa
  também a parte "Tirar".
- Inclui: o que está tirado fica guardado no navegador, como os outros filtros.
- Inclui: o mesmo na aba "Em qualificação" (US-0042), pelo CNAE principal gravado da Receita.
- Não inclui: descartar a empresa para o time (US-0010 já faz isso); "Sem SPEs" pelo nome
  (impreciso); órgãos e associações (já saem pelo filtro de natureza jurídica).

## Critérios de aceite

**Cenário 1: tirar um ramo**

- **Quando** tiro o ramo 64;
- **Então** nenhuma empresa com CNAE principal no ramo 64 aparece, e o título do grupo Ramo
  mostra "sem 64 (Serviços financeiros)".

**Cenário 2: atalho de holdings**

- **Dado** nenhum filtro de setor;
- **Quando** uso "Sem holdings";
- **Então** saem as empresas com CNAE principal 6462-0/00 ou 6463-8/00, e o chip do atalho
  aparece marcado.

**Cenário 3: incluir e tirar juntos**

- **Dado** o setor "Indústria" incluído;
- **Quando** tiro o ramo 10 (alimentos);
- **Então** vejo a indústria sem alimentos.

**Cenário 4: secundária não tira**

- **Dado** "incluir atividade secundária" ligado e "Sem holdings";
- **Quando** uma indústria tem holding só como atividade secundária;
- **Então** ela continua na lista.

**Cenário 5: o mesmo item nos dois lados**

- **Dado** o ramo 64 incluído;
- **Quando** tiro o ramo 64;
- **Então** ele sai da inclusão e fica só em "Tirar".

**Cenário 6: guardado e limpo**

- **Quando** fecho e abro a tela;
- **Então** o que tirei continua tirado; e, ao usar "Limpar", volta tudo.

## Decisões (24/11/2026)

- Victor: tirar só pela atividade principal.
- Atalhos "Sem holdings" e "Sem imobiliárias" (as duas atividades citadas no pedido); nenhum
  atalho ligado por padrão, porque a tela já abre em Indústria. Mudar é só trocar a lista de
  atalhos.

### Ajustes do teste (24/11/2026, Victor)

- "Tirar" dentro de Setor, Ramo e CNAE, e não num grupo novo.
- O grupo "Funcionários (RAIS)" passa a se chamar "Funcionários".

## Contexto técnico

- **Comportamento atual:** PROVADO — setores, ramos e CNAEs em `FiltrosReceita`
  (`src/types/filtrosReceita.ts`); na Edge Function `empresas-receita`, `atividade()` monta a
  inclusão por `secao`, `divisao` e `cnae_principal` (com `secoes_sec`, `divisoes_sec` e
  `cnaes_secundarios` quando a secundária está ligada); CNAE como começo de código vira a lista
  de códigos por `public.cnaes`.
- **Mudanças:**
  - `FiltrosReceita`: `semSetores`, `semRamos`, `semCnaes` (listas), em `FILTROS_VAZIOS`,
    `contarFiltros`, `lerFiltrosSalvos` (mesma validação da inclusão).
  - `filtrosReceita.ts`: `ATALHOS_DE_EXCLUSAO` (rótulo → setores/ramos/CNAEs) e as funções de
    alternar que tiram o item do outro lado.
  - Edge Function: validação igual à da inclusão (limite de CNAEs somando os dois lados) e
    condições `NOT (coalesce(e.secao,'') = ANY($n))`, `NOT (coalesce(e.divisao,'') = ANY($n))`,
    `NOT (e.cnae_principal = ANY(codigos))` — só pela principal, sempre por parâmetro.
  - Sem mudança no banco.
- **Desempenho (medido na VPS em 24/11/2026):** tirar os ramos 64 e 68 e as holdings, ordenando
  pelo fit de Studio: 63 ms. Indústria sem o ramo 10, até 180 km, ordenando por faturamento:
  1,1 s, o mesmo tempo da consulta sem a exclusão (a exclusão é só filtro).
- **Restrições:** tokens do tema; chips e seletores acessíveis pelo teclado.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 6 | validado pelo Victor no localhost em 24/11/2026 ("testei, tudo passou"), depois dos ajustes do primeiro teste; testes automatizados desativados |

- Regra: `semSetores`, `semRamos`, `semCnaes` em `FiltrosReceita`; `incluirAtividades`,
  `tirarAtividades`, `ATALHOS_DE_EXCLUSAO`, `alternarAtalho` (`filtrosReceita.ts`); resumos em
  `resumoDosFiltros.ts`.
- Tela: `SetorIncluirTirar`, `RamoIncluirTirar`, `CnaeIncluirTirar`
  (`src/components/prospeccao/filtros/AtividadeIncluirTirar.tsx`), nos painéis da Base e da aba
  Em qualificação; blocos comuns em `BlocosDeFiltro.tsx`.
- Edge Function `empresas-receita`: `semAtividade` com `NOT (coalesce(...) = ANY($n))`, só pela
  principal; publicada em 24/11/2026 antes do PR.
