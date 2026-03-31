ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS vaga_pretendida TEXT
    CHECK (vaga_pretendida IN (
      'tecnologia_e_desenvolvimento',
      'design_e_marketing',
      'comercial',
      'financeiro',
      'gestao_e_rh',
      'produto',
      'outros'
    ));
