ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES job_applications(id);
