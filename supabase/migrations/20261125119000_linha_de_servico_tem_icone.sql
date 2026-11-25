-- US-0048 — cada linha de serviço tem um ícone.
--
-- Pedido do Victor (25/11/2026): no cartão e no topo do projeto, a linha de serviço aparece como
-- ícone e o serviço como etiqueta, na mesma fila. O admin escolhe o ícone ao criar ou editar a
-- linha, entre um conjunto curto (as chaves batem com ICONES_DA_LINHA em
-- src/lib/catalogo.constants.ts). Coluna com padrão: o front anterior cria linha sem informar.

ALTER TABLE public.service_lines
  ADD COLUMN IF NOT EXISTS icone text NOT NULL DEFAULT 'camadas';

ALTER TABLE public.service_lines
  DROP CONSTRAINT IF EXISTS service_lines_icone_check;
ALTER TABLE public.service_lines
  ADD CONSTRAINT service_lines_icone_check
  CHECK (icone = ANY (ARRAY['camadas', 'maleta', 'moedas', 'predio', 'foguete', 'codigo', 'lampada', 'grafico', 'capelo', 'aperto_de_maos']));

COMMENT ON COLUMN public.service_lines.icone IS
  'US-0048: ícone da linha, escolhido pelo admin (chaves em ICONES_DA_LINHA, src/lib/catalogo.constants.ts).';

-- Linhas do catálogo 2027 (US-0046) já nascem com o ícone delas.
UPDATE public.service_lines SET icone = 'maleta' WHERE name = 'Projetos' AND icone = 'camadas';
UPDATE public.service_lines SET icone = 'moedas' WHERE name = 'Fomento' AND icone = 'camadas';
UPDATE public.service_lines SET icone = 'predio' WHERE name = 'Governo' AND icone = 'camadas';
