-- Adiciona o papel 'rh' ao enum app_role (módulo Jornada/Ponto).
-- Isolada em migration própria: ALTER TYPE ... ADD VALUE não pode ser usado
-- na mesma transação em que o novo valor é referenciado (mesmo padrão já
-- usado para adicionar 'manager').
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh';
