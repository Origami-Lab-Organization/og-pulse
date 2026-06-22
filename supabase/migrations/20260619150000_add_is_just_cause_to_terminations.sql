-- Adiciona campo de justa causa à tabela de desligamentos
-- Quando true: funcionário perde férias proporcionais, 13º, aviso prévio e multa FGTS (CLT Art. 482)
ALTER TABLE employee_terminations
  ADD COLUMN IF NOT EXISTS is_just_cause BOOLEAN NOT NULL DEFAULT false;
