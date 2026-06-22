# FUNC-J8 — Reembolso: Custos do Projeto e Câmera Mobile
> Jornada: Funcionário J8 · Estado auditado: ✅ IMPLEMENTADO (~80%)
> Dependências externas: aba Custos do projeto (módulo GP Projetos) para refletir reembolso pago

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Criar reembolso (`ReimbursementFormDialog.tsx`) — toggle projeto/admin, itens, upload de recibos
- Pipeline de status com badges (`Reimbursements.tsx:32-37`, `statusConfig`)
- Notificações por etapa (`reimbursement_approved/paid/rejected`)
- Corrigir e reenviar (`corrected_from_id`, pré-preenchimento da correção)
- Infra: `reimbursement_requests` (`status`, `corrected_from_id`, `rejection_reason`), `reimbursement_items`, bucket de recibos, RLS por `requested_by`

**❌ Pendente:**
- Impacto nos custos do projeto (reembolso pago não aparece na aba Custos) — F5
- Câmera mobile (`capture="environment"`) — F6
- Timestamp por etapa não renderizado na linha de status — F2 (melhoria)

## História de Usuário

**Como** Consultor que solicita reembolsos,
**quero** que um reembolso pago apareça nos custos do projeto e poder fotografar o recibo direto pela câmera no celular,
**para que** a margem do projeto reflita a despesa real e eu registre o gasto na hora, sem notebook.

## Contexto

Módulo já completo no fluxo principal (criar, status, corrigir/reenviar, notificações). Faltam dois itens: a integração com a aba Custos do projeto (transparência de margem para o GP) e a captura por câmera no mobile. O impacto nos custos é o item de maior valor de negócio e vem primeiro; a câmera é melhoria de UX mobile.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Reembolso pago nos custos do projeto**
- Reembolso com `project_id` e `status = 'paid'` aparece automaticamente na aba Custos do projeto como "Reembolso realizado"
- Impacta a margem do projeto no cálculo de custos
- GP tem somente leitura sobre o item (origem é o reembolso do consultor)

**CA-02 — Apenas pagos contam**
- Reembolso `pending`/`approved`/`rejected` não aparece nos custos (só `paid`)
- Reembolso administrativo (sem `project_id`) não afeta custo de nenhum projeto

**CA-03 — Respeito a RLS/tenant**
- A leitura na aba Custos respeita `tenant_id` e a membership do projeto
- Consultor que tenta acessar reembolso de outro via URL continua bloqueado por RLS (`requested_by`)

### Parte B — Melhorias no existente (depois)

**CA-04 — Câmera mobile**
- Upload de recibo no mobile usa `input[type=file][accept=image/*][capture=environment]` para abrir a câmera traseira diretamente
- No desktop o upload por arquivo (foto ou PDF) permanece funcionando

**CA-05 — Timestamp por etapa na linha de status**
- Cada etapa (Enviado, Aprovado, Pago / Rejeitado) exibe ícone, label e o timestamp de quando ocorreu
- Mantém o `statusConfig` atual, apenas renderizando os timestamps já disponíveis

## Fora do Escopo

- Redesenho completo da linha de status além de timestamps
- Alteração no fluxo de aprovação/rejeição (já funcional)
- Notificações novas (as de etapa já existem)

## Notas Técnicas

- Página/dialog: `src/pages/Reimbursements.tsx`, `src/components/.../ReimbursementFormDialog.tsx`
- Hook: `useReimbursements`; tabelas `reimbursement_requests` / `reimbursement_items`
- Custos: integrar na aba Custos do projeto (módulo GP Projetos) — ler reembolsos pagos com `project_id` do tenant; coordenar para não duplicar a fonte de verdade
- Câmera: ajuste localizado no input de upload de recibo
- Respeitar `tenant_id`/RLS em ambas as direções (boundary do projeto)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Reembolso de projeto pago | Aparece na aba Custos como "Reembolso realizado"; afeta margem |
| Reembolso de projeto pendente/aprovado | Não aparece nos custos |
| Reembolso administrativo pago | Não afeta custo de projeto |
| GP abre a aba Custos | Vê o item em somente leitura |
| Consultor acessa reembolso de outro via URL | Bloqueado por RLS |
| Upload de recibo no mobile | Abre câmera traseira (`capture=environment`) |
| Upload no desktop | Seleção de arquivo (foto/PDF) normal |
| Linha de status | Cada etapa com ícone, label e timestamp |
