-- Adicionar referencia ao papel do orcamento (opcional, para herdar valor/hora)
ALTER TABLE project_members 
ADD COLUMN budget_role_id UUID REFERENCES budget_roles(id);

-- Adicionar valor/hora diretamente no membro (para quando nao tiver orcamento ou for customizado)
ALTER TABLE project_members 
ADD COLUMN hourly_rate NUMERIC NOT NULL DEFAULT 0;