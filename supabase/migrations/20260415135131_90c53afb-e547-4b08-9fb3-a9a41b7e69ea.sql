ALTER TABLE strategy_key_results
  ADD COLUMN IF NOT EXISTS direction VARCHAR(20) NOT NULL DEFAULT 'higher_is_better';