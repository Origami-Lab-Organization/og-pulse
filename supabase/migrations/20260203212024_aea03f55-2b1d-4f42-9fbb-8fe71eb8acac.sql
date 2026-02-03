-- Renomear planned_date para start_date
ALTER TABLE project_milestones 
RENAME COLUMN planned_date TO start_date;

-- Adicionar coluna end_date
ALTER TABLE project_milestones 
ADD COLUMN end_date DATE;

-- Copiar dados iniciais (end_date = start_date para marcos existentes)
UPDATE project_milestones SET end_date = start_date WHERE end_date IS NULL;

-- Tornar end_date obrigatório
ALTER TABLE project_milestones 
ALTER COLUMN end_date SET NOT NULL;

-- Renomear description para deliverables
ALTER TABLE project_milestones 
RENAME COLUMN description TO deliverables;

-- Remover coluna order_index (não mais necessária)
ALTER TABLE project_milestones 
DROP COLUMN order_index;