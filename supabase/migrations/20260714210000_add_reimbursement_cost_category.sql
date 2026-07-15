-- Adiciona a categoria "reimbursement" (Reembolso) às categorias de project_costs.
-- A funcionalidade dedicada de solicitação de reembolso foi removida (ADR-0007),
-- mas reembolsos continuam sendo um custo de projeto legítimo — agora lançados
-- diretamente no cadastro unificado de custos, com categoria própria em vez de
-- caírem genericamente em "other".

ALTER TABLE public.project_costs
  DROP CONSTRAINT project_costs_category_check;

ALTER TABLE public.project_costs
  ADD CONSTRAINT project_costs_category_check
    CHECK (category IN ('supplier', 'subscription', 'equipment_rental', 'material', 'travel', 'reimbursement', 'other'));

COMMENT ON TABLE public.project_costs IS
  'Custos extra-labor do projeto em 7 categorias (J9-01 + reembolso). Valores em BRL nas colunas *_brl.';
