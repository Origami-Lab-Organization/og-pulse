# US-0044 — "Studio de Produto" passa a se chamar "Dev. de Software"

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 24/11/2026 ("pode seguir com a troca para Dev. de Software")
- **Relacionadas:** US-0014, ADR-0055

## Descrição

**Como** pessoa da Origami,
**quero** ver o serviço com o nome "Dev. de Software" em todo o sistema,
**para** usar o mesmo nome no catálogo, nos projetos e no fit do Comercial.

### Contexto

Pedido do Victor (24/11/2026), depois da US-0014. O mesmo serviço aparecia como "Product Studio"
(catálogo e projetos) e "Studio de Produto" / "Studio" (fit do Comercial).

### Escopo

- Inclui: o **serviço cadastrado** no catálogo do tenant da Origami ("Product Studio" →
  "Dev. de Software"). Os 10 projetos ligados a ele passam a mostrar o nome novo nos cards e
  telas que leem o catálogo (Portfólio, Alocação, Receita, Financeiro).
- Inclui: o rótulo fixo de projetos antigos que guardam a chave `product_studio` (tabela de
  projetos, Meus projetos).
- Inclui: o **fit** do Comercial — notas, ficha, Estudo da conta, Em qualificação e a coluna da
  Base ("Fit · Dev. de Software").
- Inclui: os exemplos dos campos de linha de serviço ("Ex.: Ventures, Dev. de Software").
- Não inclui: a chave interna `studio` (colunas `fit_studio` na VPS, Edge Function), que não
  aparece para ninguém; o centro de custo "SL02 Studio de Produto", espelho da Conta Azul (a
  sincronização regrava o nome; trocar lá primeiro, se for o caso); o tenant de demonstração.

## Critérios de aceite

**Cenário 1: catálogo**

- **Quando** abro Serviços;
- **Então** vejo "Dev. de Software" no lugar de "Product Studio".

**Cenário 2: cards de projeto**

- **Quando** abro o Portfólio e Meus projetos;
- **Então** os projetos desse serviço mostram "Dev. de Software".

**Cenário 3: fit**

- **Quando** abro a Base, Em qualificação, a ficha ou o Estudo da conta;
- **Então** o serviço aparece como "Dev. de Software" (inclusive na coluna e no filtro "Fit por
  serviço").

## Contexto técnico

- **Banco:** `services.name` do registro `4014bc78-…` (tenant Origami) atualizado em 24/11/2026
  por pedido do Victor; `projects.service_line` guarda o id, então os projetos não mudam.
- **Código:** `ROTULO_DA_FRENTE` e `ROTULO_CURTO_DA_FRENTE` em `src/lib/prospecting/fit.ts`;
  `SERVICE_LINE_OPTIONS` em `src/types/serviceLine.ts`; exemplos em `ServiceLineFormDialog`,
  `WizardStep1Line` e `Services.tsx`.
- **Pendência registrada (item 5 do Victor):** serviço novo no catálogo não ganha fit — os quatro
  serviços do fit estão fixos no código, cada um com os próprios sinais e pesos (US-0014). Tratar
  em história própria.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 3 | validado pelo Victor no localhost em 24/11/2026 ("testei, tudo passou"); testes automatizados desativados |
