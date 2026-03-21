-- Rename portfolio stage and add value_book_url column
UPDATE public.projects
  SET portfolio_stage = 'results_presentation'
  WHERE portfolio_stage = 'value_book';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS value_book_url TEXT DEFAULT NULL;