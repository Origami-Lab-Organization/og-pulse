-- "Fim Antecipado de Contrato" vira um Tipo de Desligamento explícito (não só uma
-- categoria de motivo, ver migration 20260724110000) — dispara Art. 479/480 CLT
-- (indenização/desconto por rescisão antes do fim previsto de contrato de experiência)
-- combinado com o novo campo `early_termination_initiated_by` (não persistido em coluna
-- própria — vive dentro do fluxo do wizard e é resolvido antes de gravar `is_just_cause`/
-- `termination_type`). Ver src/lib/terminationCalcs.ts.
ALTER TYPE public.termination_type ADD VALUE IF NOT EXISTS 'early_contract_termination';
