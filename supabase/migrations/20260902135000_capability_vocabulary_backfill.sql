-- PUL-200 — backfill do vocabulário de capacidades. Corrige o deploy que falhou com:
--
--   ERROR: insert or update on table "role_capabilities" violates foreign key constraint
--          "role_capabilities_capability_fkey"
--   DETAIL: Key (capability)=(ponto:ler-relatorio) is not present in table "capabilities".
--
-- Causa (erro de processo, não de desenho):
--   `20260902130000_capability_schema.sql` foi mergeada e aplicada em produção com 46
--   capacidades. Depois disso o MESMO ARQUIVO foi editado para 48, acrescentando
--   `custo-hora:ler-relatorio` e `ponto:ler-relatorio` — as duas correções que a
--   transcrição da matriz exigiu (`custo-hora:ler` aparecia duas vezes com respostas
--   diferentes, e `ponto:relatorio:ler` estava fora do padrão `dominio:acao`).
--
--   Migration já registrada em `supabase_migrations.schema_migrations` NÃO é reaplicada.
--   Então produção ficou com 46 capacidades, enquanto o arquivo no repositório diz 48 — e
--   `20260902140000` (o seed), que concede `ponto:ler-relatorio` ao papel RH, estourou a
--   foreign key.
--
--   A lição, que vale mais que a correção: **nunca editar migration já mergeada.** O
--   arquivo estava commitado mas eu supus que não tinha sido aplicado em ambiente nenhum;
--   o merge e o deploy haviam acontecido fora desta sessão. A regra correta não depende
--   de saber o estado dos ambientes: uma vez que a migration sai do seu branch, ela é
--   imutável, e toda mudança vira migration nova.
--
-- Por que backfill em vez de reverter a edição da 130000:
--   Assim os dois caminhos convergem para o mesmo estado. Em produção (46), este INSERT
--   acrescenta as duas que faltam. Num banco criado do zero, a 130000 já entrega as 48 e
--   este INSERT é no-op pelo ON CONFLICT. Reverter a 130000 para 46 deixaria o histórico
--   coerente com produção, mas quebraria a criação do zero.

INSERT INTO public.capabilities (key, domain, label, is_sensitive) VALUES
  ('custo-hora:ler-relatorio', 'financeiro', 'Ver o relatório consolidado de custo/hora', true),
  ('ponto:ler-relatorio',      'ponto',      'Ver relatórios de ponto',                   true)
ON CONFLICT (key) DO NOTHING;
