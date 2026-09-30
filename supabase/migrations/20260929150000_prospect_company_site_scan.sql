-- Prospecção — leitura do site oficial da empresa (29/09/2026).
--
-- A Edge Function `company-site-scan` lê o site da empresa (campo Site, ou o domínio do e-mail
-- de cadastro na Receita quando não é e-mail gratuito) e guarda o que achou:
--   - redes e contatos DA EMPRESA publicados no próprio site: LinkedIn, Instagram, Facebook,
--     YouTube, WhatsApp, telefones e e-mails genéricos (contato@, comercial@);
--   - pistas do sistema que ela usa (TOTVS, SAP, Senior, Sankhya, MES, Indústria 4.0, portal do
--     fornecedor) — o gancho da frente de software sob medida e integração.
-- É dado que a empresa publica sobre si; nada de pessoa física é buscado (ADR-0041).
--
-- LinkedIn, Instagram e Site da empresa só são preenchidos se estiverem vazios: o que a pessoa
-- cadastrou vence o que o site diz. O resto fica em `site_scan`, que a tela exibe.
--
-- Acesso: a função roda com o JWT de quem chama, sob a RLS de `prospect_companies`
-- (`prospeccao:editar` para gravar). Sem capacidade nova.
--
-- Rollback: supabase/rollback/20260929150000_prospect_company_site_scan_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS site_scan    jsonb,
  ADD COLUMN IF NOT EXISTS site_scan_em timestamptz;

COMMENT ON COLUMN public.prospect_companies.site_scan IS
  'O que o site oficial publica: { url, redes: {linkedin, instagram, facebook, youtube}, '
  'whatsapp[], telefones[], emails[], sistemas[], sinais[], paginas[] }. Gravado pela Edge '
  'Function company-site-scan.';
COMMENT ON COLUMN public.prospect_companies.site_scan_em IS
  'Última leitura do site. Os dados valem até esta data.';
