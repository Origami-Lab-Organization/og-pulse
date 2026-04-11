-- Seed DoR and DoD templates for the Propulse project (Origami Lab tenant).
-- Run AFTER 20260411220000_checklist_templates_card_type.sql is applied.

do $$
declare
  v_project_id uuid;
  v_tenant_id  uuid;
begin
  -- Resolve IDs
  select id into v_tenant_id
    from tenants
   where name ilike '%Origami%'
   limit 1;

  select id into v_project_id
    from projects
   where name ilike '%Propulse%'
     and tenant_id = v_tenant_id
   limit 1;

  if v_project_id is null then
    raise notice 'Propulse project not found — skipping checklist seed.';
    return;
  end if;

  -- Clear existing templates for this project
  delete from project_activity_checklist_templates
   where project_id = v_project_id;

  -- ── DoR — Comuns (card_type = null) ────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dor', null,
    '[
      {"text": "Título claro e autoexplicativo (sem abreviações internas)"},
      {"text": "Responsável atribuído antes de entrar no Sprint Backlog"},
      {"text": "Card não está marcado como bloqueado (is_blocked = false)"},
      {"text": "Cabe dentro de um sprint (se maior, deve ser quebrado em subtasks)"}
    ]'::jsonb
  );

  -- ── DoR — História ─────────────────────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dor', 'story',
    '[
      {"text": "Escrita em formato \"Como [perfil], quero [ação] para [valor]?\""},
      {"text": "Critérios de aceite definidos e revisados pelo PM"},
      {"text": "Wireframe ou referência de UX anexada (quando há interface)"},
      {"text": "Pontos estimados"},
      {"text": "Epic pai vinculado"},
      {"text": "Dependências e bloqueios identificados"}
    ]'::jsonb
  );

  -- ── DoR — Bug ──────────────────────────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dor', 'bug',
    '[
      {"text": "Comportamento esperado vs. comportamento atual descritos"},
      {"text": "Passos para reproduzir documentados"},
      {"text": "Ambiente afetado identificado (dev / staging / produção)"},
      {"text": "Severidade definida (crítico / alto / médio / baixo)"},
      {"text": "Print ou log de erro anexado (quando disponível)"}
    ]'::jsonb
  );

  -- ── DoR — Dívida Técnica ───────────────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dor', 'tech_debt',
    '[
      {"text": "Problema técnico atual descrito claramente"},
      {"text": "Impacto no produto ou na velocidade do time explicado"},
      {"text": "Abordagem de solução proposta (não precisa ser definitiva)"},
      {"text": "Pontos estimados"},
      {"text": "Arquivos ou módulos afetados identificados"}
    ]'::jsonb
  );

  -- ── DoR — Tarefa ───────────────────────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dor', 'task',
    '[
      {"text": "Objetivo e entregável esperado descritos claramente"},
      {"text": "Responsável atribuído"},
      {"text": "Prazo ou sprint-alvo definido"},
      {"text": "Dependências de outros cards ou pessoas mapeadas"}
    ]'::jsonb
  );

  -- ── DoD — Comum (card_type = null) ────────────────────────────────────────
  insert into project_activity_checklist_templates
    (project_id, tenant_id, type, card_type, items)
  values (
    v_project_id, v_tenant_id, 'dod', null,
    '[
      {"text": "Código revisado por pelo menos um outro membro do time"},
      {"text": "Testes automatizados escritos ou atualizados"},
      {"text": "Funcionalidade testada em ambiente de homologação"},
      {"text": "Documentação atualizada (quando aplicável)"},
      {"text": "PM ou Admin validou o entregável"}
    ]'::jsonb
  );

  raise notice 'Checklist templates seeded for Propulse (project_id = %)', v_project_id;
end $$;
