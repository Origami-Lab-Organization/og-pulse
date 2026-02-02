-- Renomear coluna de discount_percent para discount_value
ALTER TABLE budgets RENAME COLUMN discount_percent TO discount_value;

-- Converter valores existentes: percentual para valor absoluto
-- discount_value = total_with_fees * (old_percent / 100)
UPDATE budgets 
SET discount_value = total_with_fees * (discount_value / 100)
WHERE discount_value > 0;