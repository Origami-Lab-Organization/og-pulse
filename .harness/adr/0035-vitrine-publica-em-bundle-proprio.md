# ADR 0035: Vitrine publica em bundle proprio, separada do app

- Status: proposto
- Data: 2026-09-17
- Decisores: Italo Castro

## Contexto

O site publico (home, 13 paginas de conteudo, termos, privacidade e 404) e o produto
dividiam o mesmo entry: `index.html` e `app.html` carregavam ambos `src/main.tsx`, que
monta `App.tsx`. Como `App.tsx` importa as ~43 paginas do produto estaticamente, toda
pagina de marketing baixava o ERP inteiro.

Medido no `dist/` antes da mudanca:

| Arquivo | Bruto | Gzip |
|---|---|---|
| `main-BvmTmggV.js` | 4.983.373 B | 1.329.539 B |
| `Configuration-BW4r47TU.js` | 61.372 B | 20.163 B |
| **Total JS por pagina publica** | **5.044.745 B** | **1.349.702 B** |

Isso custa em dois lugares que importam para busca:

- **Core Web Vitals.** LCP e INP no celular sao sinal de ranqueamento. Uma pagina de
  texto que baixa 1,3 MB de JavaScript para hidratar conteudo ja pre-renderizado nao
  tem como pontuar bem.
- **Rastreio.** Em 17/09/2026, 8 das 12 URLs do sitemap estavam "Detectada, mas nao
  indexada", com "ultimo rastreio: nunca" (Search Console). Peso de pagina entra na
  conta que o Google faz para decidir onde gastar rastreio.

As paginas publicas nao usam Supabase, MSAL, TanStack Query, tema, tooltip nem toast —
so react-router, icones, o `Button` do shadcn e o conteudo de `src/landing/`. O custo
era estrutural, nao funcional.

Alternativas consideradas:

1. `React.lazy` nas rotas do app, mantendo um entry so. Reduz o inicial, mas a vitrine
   continua carregando providers, AuthContext e o cliente Supabase — e mantem o acoplamento.
2. Mover a vitrine para um projeto separado. Resolve de vez, mas duplica design system,
   deploy e o `content.ts` que hoje alimenta sitemap, `llms.txt` e JSON-LD.
3. Entry proprio no mesmo repo e no mesmo build. Escolhida.

## Decisao

`index.html` passa a carregar `src/landing-main.tsx`, um entry que monta apenas as rotas
publicas. `app.html` segue com `src/main.tsx` e o `App.tsx` completo. Os dois convivem no
mesmo `vite build` (ja eram entradas separadas no `rollupOptions.input`).

Consequencias diretas:

- Link do site publico para rota do app (`/login`, `/register`) vira navegacao de pagina
  inteira, pelo componente `src/landing/AppLink.tsx` (`<a href>`, nao `<Link>`). Um
  `<Link>` tentaria resolver a rota dentro do roteador publico e cairia na 404.
- Quem tem sessao e abre `/` e mandado para `/dashboard` por `window.location.replace`,
  a partir de uma checagem de `localStorage` (`hasStoredSession`), sem rede.
- As fontes sairam do `@import` do `src/index.css` para `<link>` com `preconnect` no HTML:
  o `@import` so era descoberto depois de baixar e parsear o CSS, atrasando o LCP.

Resultado medido depois:

| | Bruto | Gzip |
|---|---|---|
| JS por pagina publica | 601.691 B | 177.195 B |
| **Reducao** | **-88,1%** | **-86,9%** |

Verificado que o chunk da vitrine nao contem `supabase`, `msal`, `exceljs`, `tanstack`,
`dnd-kit`, `face-api` nem `recharts` — e que contem Amplitude, exigido pelo ADR-0030
para o modo vitrine.

## Consequencias

- Beneficios:
  - Pagina publica 7,6x mais leve em gzip; LCP e INP deixam de ser limitados pelo bundle.
  - Vitrine deixa de carregar o cliente Supabase e o MSAL — menos superficie exposta em
    pagina que nao autentica ninguem.
  - O app pode crescer sem penalizar o SEO, que era o acoplamento perverso anterior.
- Custos:
  - Duas listas de rotas publicas para manter em sincronia: `src/landing-main.tsx` e
    `src/landing/prerender-entry.tsx`. Rota publica nova precisa entrar nas duas (e em
    `App.tsx`, se tambem for navegavel de dentro do app).
  - Ir da vitrine para `/login` ou `/register` agora recarrega a pagina, em vez de
    transicao de SPA. E o unico caminho onde a pessoa sente a mudanca.
- Riscos:
  - **Admin logado que abre `/` cai em `/dashboard`, nao em `/admin-dashboard`.** Antes,
    o `RootEntry` decidia pelo papel via `HomeRedirect`; a vitrine nao conhece o papel
    sem carregar o Supabase, que e justamente o que esta ADR evita. `/dashboard` e rota
    protegida valida para admin, entao o caso e de conveniencia, nao de acesso. Se o time
    quiser o comportamento exato de volta, o caminho e uma rota do app dedicada ao
    HomeRedirect (custo: mais um segmento em `vercel.json`).
  - Esquecer o espelho de rotas derruba a rota nova so em producao, no F5. Mitigado
    porque o build ja falha quando uma rota publica sai sem `<h1>` ou sem JSON-LD.
- Como reverter: apontar `index.html` de volta para `/src/main.tsx` e trocar `AppLink`
  por `Link`. Nenhuma migration, nenhum dado, nenhum estado externo envolvido.

## Evidencias

- `src/landing-main.tsx`, `src/landing/AppLink.tsx`, `index.html`, `app.html`, `src/index.css`.
- `npm run build` verde: 17 paginas pre-renderizadas, 14 indexaveis.
- Medicao antes/depois no `dist/`, com `gzip -c | wc -c` por arquivo referenciado no HTML.
- Estado de indexacao em 17/09/2026: `npm run gsc:status`.
