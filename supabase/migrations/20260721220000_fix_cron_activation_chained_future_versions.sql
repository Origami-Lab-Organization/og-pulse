-- Corrige um bug real no agendamento de marcos financeiros encadeados, encontrado ao
-- verificar o fluxo de "programar mudança para data futura" fim a fim.
--
-- Cenário: usuário agenda a Mudança A para 01/08 (cria employee_versions com
-- effective_from=01/08, effective_until=NULL — versão aberta). Depois agenda a
-- Mudança B para 01/09. createVersion() (employeeVersionService.ts) fecha "a versão
-- cujo intervalo CONTÉM o effectiveFrom da nova versão" — como a versão A é aberta,
-- ela CONTÉM 01/09, então A é fechada (effective_until=01/09) e B se torna a nova
-- versão aberta. Isso é correto e necessário (A realmente termina quando B começa).
--
-- O bug: a versão anterior de activate_scheduled_employee_versions() só ativava
-- versões com "effective_until IS NULL AND effective_from <= CURRENT_DATE" — ou
-- seja, só a versão ABERTA. Quando 01/08 chega, a versão A já não está mais aberta
-- (foi fechada ao criar B) — então o cron NUNCA a ativa, mesmo com effective_from já
-- alcançado. Só quando 01/09 chega é que B (agora sim aberta e com effective_from
-- já alcançado) é ativada — pulando o período inteiro de A no cadastro AO VIVO
-- (employees), mesmo que employee_versions mostre A corretamente como um período
-- histórico na aba Histórico. Ou seja: agendar 2+ marcos futuros em sequência fazia
-- os marcos intermediários nunca chegarem a valer de fato no cadastro.
--
-- Correção: em vez de "a versão aberta com effective_from já alcançado", busca "a
-- versão cujo intervalo [effective_from, effective_until) contém hoje" — mesmo
-- padrão já usado pela busca de supersededVersion em employeeService.ts.
CREATE OR REPLACE FUNCTION public.activate_scheduled_employee_versions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.employees DISABLE TRIGGER prevent_employee_self_escalation;

  UPDATE public.employees e
  SET
    tipo_contratacao = ev.tipo_contratacao,
    salario_mensal = ev.salario_mensal,
    salario_liquido = ev.salario_liquido,
    beneficios = ev.beneficios,
    encargos = ev.encargos,
    fgts = ev.fgts,
    inss_empresa = ev.inss_empresa,
    decimo_terceiro = ev.decimo_terceiro,
    ferias = ev.ferias,
    pro_labore = ev.pro_labore,
    jornada_mensal = ev.jornada_mensal,
    jornada_diaria = ev.jornada_diaria,
    cargo = ev.cargo,
    total_monthly_cost_estimated = COALESCE(ev.total_monthly_cost_estimated, e.total_monthly_cost_estimated),
    bolsa_auxilio = COALESCE(ev.bolsa_auxilio, e.bolsa_auxilio),
    valor_contrato_pj = COALESCE(ev.valor_contrato_pj, e.valor_contrato_pj),
    dividendos = COALESCE(ev.dividendos, e.dividendos),
    total_annual_cost_estimated = COALESCE(ev.total_annual_cost_estimated, e.total_annual_cost_estimated),
    breakdown_json = COALESCE(ev.breakdown_json, e.breakdown_json),
    nome = COALESCE(ev.nome, e.nome),
    telefone = COALESCE(ev.telefone, e.telefone),
    cpf = COALESCE(ev.cpf, e.cpf),
    data_nascimento = COALESCE(ev.data_nascimento, e.data_nascimento),
    data_admissao = COALESCE(ev.data_admissao, e.data_admissao),
    foto_url = COALESCE(ev.foto_url, e.foto_url),
    pix_key_type = COALESCE(ev.pix_key_type, e.pix_key_type),
    pix_key = COALESCE(ev.pix_key, e.pix_key),
    bank_name = COALESCE(ev.bank_name, e.bank_name),
    bank_account_type = COALESCE(ev.bank_account_type, e.bank_account_type),
    bank_agency = COALESCE(ev.bank_agency, e.bank_agency),
    bank_account = COALESCE(ev.bank_account, e.bank_account)
  FROM public.employee_versions ev
  WHERE ev.employee_id = e.id
    -- Versão cujo intervalo contém hoje (não necessariamente a "aberta" — uma versão já
    -- pode ter sido fechada por um marco futuro criado depois dela, sem deixar de ser a
    -- vigente até sua própria data de vigência chegar).
    AND ev.effective_from <= CURRENT_DATE
    AND (ev.effective_until IS NULL OR ev.effective_until > CURRENT_DATE)
    AND (
      e.tipo_contratacao IS DISTINCT FROM ev.tipo_contratacao
      OR e.salario_mensal IS DISTINCT FROM ev.salario_mensal
      OR e.salario_liquido IS DISTINCT FROM ev.salario_liquido
      OR e.beneficios IS DISTINCT FROM ev.beneficios
      OR e.encargos IS DISTINCT FROM ev.encargos
      OR e.fgts IS DISTINCT FROM ev.fgts
      OR e.inss_empresa IS DISTINCT FROM ev.inss_empresa
      OR e.decimo_terceiro IS DISTINCT FROM ev.decimo_terceiro
      OR e.ferias IS DISTINCT FROM ev.ferias
      OR e.pro_labore IS DISTINCT FROM ev.pro_labore
      OR e.jornada_mensal IS DISTINCT FROM ev.jornada_mensal
      OR e.jornada_diaria IS DISTINCT FROM ev.jornada_diaria
      OR e.cargo IS DISTINCT FROM ev.cargo
      OR e.total_monthly_cost_estimated IS DISTINCT FROM COALESCE(ev.total_monthly_cost_estimated, e.total_monthly_cost_estimated)
      OR e.bolsa_auxilio IS DISTINCT FROM COALESCE(ev.bolsa_auxilio, e.bolsa_auxilio)
      OR e.valor_contrato_pj IS DISTINCT FROM COALESCE(ev.valor_contrato_pj, e.valor_contrato_pj)
      OR e.dividendos IS DISTINCT FROM COALESCE(ev.dividendos, e.dividendos)
      OR e.total_annual_cost_estimated IS DISTINCT FROM COALESCE(ev.total_annual_cost_estimated, e.total_annual_cost_estimated)
      OR e.breakdown_json IS DISTINCT FROM COALESCE(ev.breakdown_json, e.breakdown_json)
      OR e.nome IS DISTINCT FROM COALESCE(ev.nome, e.nome)
      OR e.telefone IS DISTINCT FROM COALESCE(ev.telefone, e.telefone)
      OR e.cpf IS DISTINCT FROM COALESCE(ev.cpf, e.cpf)
      OR e.data_nascimento IS DISTINCT FROM COALESCE(ev.data_nascimento, e.data_nascimento)
      OR e.data_admissao IS DISTINCT FROM COALESCE(ev.data_admissao, e.data_admissao)
      OR e.foto_url IS DISTINCT FROM COALESCE(ev.foto_url, e.foto_url)
      OR e.pix_key_type IS DISTINCT FROM COALESCE(ev.pix_key_type, e.pix_key_type)
      OR e.pix_key IS DISTINCT FROM COALESCE(ev.pix_key, e.pix_key)
      OR e.bank_name IS DISTINCT FROM COALESCE(ev.bank_name, e.bank_name)
      OR e.bank_account_type IS DISTINCT FROM COALESCE(ev.bank_account_type, e.bank_account_type)
      OR e.bank_agency IS DISTINCT FROM COALESCE(ev.bank_agency, e.bank_agency)
      OR e.bank_account IS DISTINCT FROM COALESCE(ev.bank_account, e.bank_account)
    );

  ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_escalation;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_scheduled_employee_versions() FROM PUBLIC;
