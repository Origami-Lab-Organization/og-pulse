-- Permitir que employee_id seja NULL para papéis sem funcionário associado
ALTER TABLE project_members 
ALTER COLUMN employee_id DROP NOT NULL;