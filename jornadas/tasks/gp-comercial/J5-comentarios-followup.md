# GP-J5 — Comentários e Alertas de Follow-up
> Jornada: GP Comercial J5 · Estado auditado: 🟡 PARCIAL (~60%)
> Dependências externas: nenhuma. (Polling de 60s já configurado; Realtime opcional não é dependência.)

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Criar follow-up: `useLeadFollowUps.ts` `useCreateFollowUp()`; tabela `lead_follow_ups` (`scheduled_at`, `assigned_to`, `status`, `description`)
- Polling de updates: `useLeadFollowUps.ts:77` `refetchInterval: 60000`
- Timeline `LeadActivityTimeline.tsx` + tabela `lead_activity_log` (migration 20260314120000) com tipos automáticos
- Card recebe `pendingFollowUps` (`LeadKanbanCard.tsx`)

**❌ Pendente:**
- Indicador vermelho de **follow-up vencido** no card do Kanban
- Distinção visual dos **3 tipos** na timeline (automática vs. comentário vs. follow-up)
- **Upload de anexos** em comentários

## História de Usuário

**Como** GP Comercial,
**quero** ver no card do pipeline quando um follow-up está vencido, distinguir atividades automáticas de comentários na timeline e anexar arquivos aos comentários,
**para que** eu entenda em 10 segundos o último contato, o que foi discutido e o próximo passo — sem abrir cada oportunidade.

## Contexto

Jornada J5. A infraestrutura de comentários/follow-ups e o polling de 60s já existem; falta a camada visual. "Pendente primeiro": o indicador de vencido no card e a distinção dos 3 tipos na timeline são o núcleo da jornada (leitura em 10s e no pipeline). O upload de anexos completa F4. Tudo respeita `tenant_id`/RLS — anexos vão para bucket Supabase com RLS por tenant/oportunidade.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Follow-up vencido no card (F3)**
- Card do Kanban exibe indicador vermelho quando há follow-up com `scheduled_at < now()` e `status != 'done'`
- Próximo follow-up futuro: indicador neutro/verde
- Helper reutilizável: "vencido" = `scheduled_at < now() && status !== 'done'`

**CA-02 — Distinção visual dos 3 tipos na timeline (F1)**
- Atividade automática (mudança de etapa, orçamento criado, de `lead_activity_log`): ícone cinza, texto compacto
- Comentário manual: avatar colorido + texto completo
- Follow-up: ícone de calendário + badge de status (pendente / concluído / vencido)

**CA-03 — Upload de anexos em comentários (F4)**
- GP anexa PDF ou imagem a um comentário; exibido como link de download na timeline
- Arquivo gravado em bucket Supabase com RLS por `tenant_id`/oportunidade; URL assinada para download
- Validar tipo e tamanho do arquivo (erro claro sem travar o comentário)

### Parte B — Melhorias no existente (depois)

**CA-04 — Coerência com o polling existente**
- O cálculo de "vencido" reage ao `refetchInterval: 60000` já configurado — sem novo mecanismo
- Polling não interrompe o GP enquanto digita um comentário (cenário-limite)

**CA-05 — Robustez visual**
- Comentário com 2000+ caracteres não quebra o layout da timeline
- Dois GPs comentando ao mesmo tempo na mesma oportunidade: sem conflito (cada comentário é uma entrada)

## Fora do Escopo
- Migração de polling para Realtime (a jornada pede apenas **documentar** se 60s basta — manter polling)
- Criar follow-up (F2) — já implementado
- Renomeação "CRM/Lead/Funil" (GP-J2 — task separada)
- Normalização/menções dentro do comentário (avaliar depois)

## Notas Técnicas
- Componentes: `src/components/crm/LeadKanbanCard.tsx`, `src/components/crm/LeadActivityTimeline.tsx`
- Hook: `src/hooks/useLeadFollowUps.ts` (não recriar polling); tipos automáticos em `lead_activity_log`
- Centralizar o helper de "vencido" e reusar no card e na timeline (não duplicar)
- Anexos: bucket Supabase + RLS por tenant; URL assinada para download

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Oportunidade com follow-up vencido | Card com indicador vermelho |
| Follow-up futuro | Indicador neutro/verde |
| Timeline com etapa + comentário + follow-up | 3 estilos visuais distintos |
| Follow-up concluído | Badge "concluído", sem alerta de vencido |
| Anexar PDF a um comentário | Link de download na timeline; arquivo no bucket com RLS |
| Anexo de tipo/tamanho inválido | Erro claro; comentário não quebra |
| Comentário 2000+ caracteres | Layout íntegro |
| Polling de 60s durante digitação | Não interrompe a digitação; vencido recalcula no ciclo |
| Tenant diferente | RLS impede ver comentários/anexos de outro tenant |
