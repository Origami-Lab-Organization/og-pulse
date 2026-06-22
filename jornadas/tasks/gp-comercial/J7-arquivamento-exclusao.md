# GP-J7 — Arquivamento e Exclusão de Oportunidades
> Jornada: GP Comercial J7 · Estado auditado: 🟡 PARCIAL (~50%)
> Dependências externas: nenhuma. (Campo `competitor_name` alimenta GP-J11 Analytics — não bloqueante.)

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Motivo de perda obrigatório: `ArchiveLeadDialog.tsx:19-60` + `ARCHIVE_REASONS` (7 motivos); botão "Confirmar arquivo" desabilitado sem motivo
- Restauração base: `leadService.ts` `unarchiveLead()` + `useUnarchiveLead()`
- Exclusão definitiva admin-only: `useDeleteLead()` + botão só para admin

**❌ Pendente:**
- Campo **`competitor_name`** (não existe em `LeadDB`) + input condicional quando motivo = "Concorrência"
- **Seleção de etapa** na restauração (hoje não há diálogo de escolha)
- Badge **"Reativada"** por 48h após restaurar
- **Confirmação por digitação** do nome na exclusão definitiva (admin)

## História de Usuário

**Como** GP Comercial,
**quero** arquivar uma oportunidade perdida com motivo e concorrente, restaurá-la escolhendo a etapa de retorno, e ter a exclusão definitiva protegida por confirmação,
**para que** eu mantenha o pipeline limpo sem perder o histórico de win/loss e sem risco de exclusão acidental.

## Contexto

Jornada J7. O esqueleto (motivo obrigatório, restauração, delete admin-only) existe; faltam o dado de concorrente (que alimenta GP-J11), a UX de restauração e as proteções. "Pendente primeiro": o campo de concorrente e a seleção de etapa são o núcleo da jornada; o badge "Reativada" e a confirmação por digitação são reforços. Respeitar `tenant_id`/RLS: arquivamento, restauração e exclusão sempre escopados ao tenant; exclusão permanece restrita a admin por RLS.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Campo concorrente no banco (F2)**
- Adicionar `competitor_name TEXT NULL` na tabela de oportunidades (`leads`) via migration versionada; refletir em `src/types/lead.ts` (`LeadDB`)

**CA-02 — Input condicional de concorrente (F2)**
- No `ArchiveLeadDialog`, input "Concorrente" aparece **somente** quando o motivo = "Concorrência" (`competitor`, já em `ARCHIVE_REASONS`)
- Quando visível, é obrigatório para confirmar; motivo ≠ "Concorrência" grava `competitor_name = null`
- `archiveLead()`/service grava `competitor_name` junto com o motivo (escopado por tenant)

**CA-03 — Seleção de etapa na restauração (F3)**
- Ao restaurar, diálogo pede a etapa de retorno (não assume a etapa anterior automaticamente)
- `unarchiveLead()` recebe a etapa escolhida e reposiciona a oportunidade no pipeline
- Cliente excluído entre arquivo e restauração: erro tratado graciosamente (cenário-limite)

### Parte B — Melhorias no existente (depois)

**CA-04 — Badge "Reativada" 48h (F3)**
- Oportunidade restaurada exibe badge "Reativada" por 48h a partir da restauração; some automaticamente após o período

**CA-05 — Confirmação por digitação na exclusão (F4)**
- Botão de exclusão definitiva continua invisível para GP (só admin)
- Admin precisa digitar o nome exato da oportunidade antes de habilitar "Confirmar exclusão"
- RLS continua restringindo a exclusão a admin (defesa no servidor, não só na UI)

**CA-06 — Dado disponível para Analytics (F2)**
- `competitor_name` fica acessível para GP-J11 (motivos de perda com concorrentes); não exibir gráfico aqui — apenas garantir o dado

## Fora do Escopo
- Gráfico "concorrentes mais citados" no dashboard (GP-J11 — task separada)
- Cancelamento automático de follow-ups futuros ao arquivar (cenário-limite — avaliar depois)
- Alerta especial ao arquivar oportunidade com orçamento aprovado (cenário-limite)
- Normalização de nomes duplicados de concorrente ("Totvs"/"TOTVS") — avaliar depois
- Renomeação "CRM/Lead/Funil" (GP-J2 — task separada)

## Notas Técnicas
- Tipos: `src/types/lead.ts` (`LeadDB`); dialog: `src/components/crm/ArchiveLeadDialog.tsx`; service: `src/services/leadService.ts`
- `ARCHIVE_REASONS` já contém `competitor` — usar como gatilho da condicional
- Restauração: estender `unarchiveLead()`/`useUnarchiveLead()` para receber a etapa; reusar componente de seleção de etapa do pipeline
- Badge 48h: derivar de timestamp de restauração (sem job agendado — calcular na renderização)
- Confirmação por digitação: padrão de "type-to-confirm" reutilizável

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Motivo = Concorrência | Campo "Concorrente" aparece e é obrigatório |
| Confirmar sem concorrente (motivo Concorrência) | Botão bloqueado |
| Motivo ≠ Concorrência | Campo oculto; `competitor_name = null` |
| Arquivar com concorrente preenchido | `competitor_name` salvo na oportunidade |
| Restaurar oportunidade | Diálogo pede etapa; oportunidade volta na etapa escolhida |
| Restaurar com cliente excluído | Erro tratado graciosamente |
| Oportunidade recém-restaurada | Badge "Reativada" visível; some após 48h |
| GP tenta excluir definitivamente | Botão invisível para GP |
| Admin exclui sem digitar o nome | "Confirmar exclusão" desabilitado |
| Admin digita o nome correto | Exclusão habilitada e executada (RLS valida admin) |
| Tenant diferente | RLS impede arquivar/restaurar/excluir oportunidade de outro tenant |
