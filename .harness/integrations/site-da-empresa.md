# Integração: leitura do site oficial da empresa

- Status: **ativa** desde 29/09/2026.
- Código: Edge Function `supabase/functions/company-site-scan/index.ts`; tela em
  `src/components/prospeccao/CompanySiteSection.tsx` ("Ler site", na ficha da empresa).
- Migration: `supabase/migrations/20260929150000_prospect_company_site_scan.sql`.
- Decisão: ADR-0041 (dados da empresa, nunca de pessoa física).

## O que faz

A partir do `company_id`, a função descobre a URL (campo Site, ou o domínio do e-mail de
cadastro na Receita quando não é e-mail gratuito). Ela lê a página inicial e até duas páginas
do mesmo domínio (contato, sobre, trabalhe conosco) e grava em
`prospect_companies.site_scan`:

| Campo | De onde sai |
|---|---|
| `redes.linkedin/instagram/facebook/youtube` | links do site para o perfil da empresa (descarta links de compartilhar e de post) |
| `whatsapp` | links `wa.me` e `api.whatsapp.com` |
| `telefones` | links `tel:` e números no formato brasileiro no texto (máx. 6) |
| `emails` | só caixas **genéricas** do domínio do site (contato@, comercial@, rh@...); caixa com nome de pessoa fica de fora |
| `sistemas` | menção a TOTVS/Protheus, SAP, Senior, Sankhya, Oracle, Dynamics, Omie, Bling |
| `sinais` | MES, Indústria 4.0, automação, portal do fornecedor, vagas de TI, P&D, ISO, exportação |

LinkedIn, Instagram e Site da empresa só são preenchidos quando estão vazios.

## Segurança (SSRF)

A URL vem de cadastro, então a função é tratada como porta de entrada:
- só `http`/`https`, nas portas 80 e 443, e sem usuário ou senha na URL;
- recusa `localhost`, nomes internos (`.local`, `.internal`...) e IP literal privado ou
  reservado. Também **resolve o DNS** e recusa nome público que aponte para rede interna;
- segue redirecionamentos à mão, no máximo 3, revalidando cada salto;
- limite de 8 s por página e 1,5 MB lidos, só `text/html`;
- roda com o JWT de quem chama (`auth.getUser`), e leitura e escrita passam pela RLS
  (`prospeccao:editar` para gravar). Nunca usa service role;
- o log não registra URL nem corpo.

Ensaio de 29/09/2026: recusou `localhost`, `169.254.169.254` (metadados de nuvem),
`10.0.0.1`, `ftp://`, URL com senha e porta 8080. Leu Tupy, Embraco e FIEMG; WEG e Marcopolo
bloqueiam robôs (403), e a tela mostra "O site respondeu 403".

## Falhas

- Site que bloqueia robô (403), fora do ar ou lento: a mensagem aparece na tela e o cadastro
  manual continua.
- Empresa sem Site e sem e-mail de domínio próprio: a função pede o Site.

## Identificação

User-Agent `Mozilla/5.0 (compatible; OrigamiPulse/1.0; +https://origamipulse.com.br)`. Um
pedido por ação da pessoa, nunca em varredura.
