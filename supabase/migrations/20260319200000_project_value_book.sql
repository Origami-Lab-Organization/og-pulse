-- Migrate value_book stage → results_presentation and add value_book_url column

UPDATE projects
SET portfolio_stage = 'results_presentation'
WHERE portfolio_stage = 'value_book';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS value_book_url TEXT DEFAULT NULL;
