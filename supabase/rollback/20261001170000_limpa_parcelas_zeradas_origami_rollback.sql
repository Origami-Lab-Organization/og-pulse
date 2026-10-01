-- Reverte 20261001170000_limpa_parcelas_zeradas_origami.sql: devolve as parcelas exatamente como
-- eram (mesmo id, número, datas e status), a partir da cópia em legado_limpezas.
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.

INSERT INTO public.project_installments
SELECT * FROM legado_limpezas.parcelas_zeradas_20261001
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS legado_limpezas.parcelas_zeradas_20261001;
