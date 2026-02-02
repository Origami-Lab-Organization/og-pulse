-- Add new values to the budget_status enum
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'active';