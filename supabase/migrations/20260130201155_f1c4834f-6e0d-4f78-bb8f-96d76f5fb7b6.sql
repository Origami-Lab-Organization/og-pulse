-- Add net_margin_percent column to budgets table to store the margin snapshot
ALTER TABLE public.budgets 
ADD COLUMN net_margin_percent numeric NOT NULL DEFAULT 0;