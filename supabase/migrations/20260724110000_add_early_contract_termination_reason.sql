-- Novo motivo de desligamento "Fim Antecipado de Contrato" — usado quando um contrato de
-- experiência (ou outro prazo determinado) termina antes da data prevista, disparando
-- indenização/desconto Art. 479/480 CLT (ver src/lib/terminationCalcs.ts).
ALTER TYPE public.termination_reason_category ADD VALUE IF NOT EXISTS 'early_contract_termination';
