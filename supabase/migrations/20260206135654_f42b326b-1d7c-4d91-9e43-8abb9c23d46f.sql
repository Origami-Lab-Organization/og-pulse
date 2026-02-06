-- Add gross_margin_target_percent column to financial_settings
ALTER TABLE financial_settings 
  ADD COLUMN IF NOT EXISTS gross_margin_target_percent numeric DEFAULT 0;

-- Migrate existing data from net_margin_percent
UPDATE financial_settings 
SET gross_margin_target_percent = net_margin_percent 
WHERE gross_margin_target_percent = 0 AND net_margin_percent > 0;