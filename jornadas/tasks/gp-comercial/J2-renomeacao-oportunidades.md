# GP-J2 — Gestão de Oportunidades (Renomeação CRM)

> Jornada: GP Comercial J2 · Estado auditado: ❌ NÃO EXISTE (~10%)
> Dependências externas: F2 (`service_line_id`) depende de Admin J4 (Tsuru) — renomeação, cliente inline e exclusão protegida NÃO dependem do catálogo

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Módulo funcional de "CRM" com entidade `leads`, pipeline Kanban, drag-and-drop, formulário (`LeadFormDialog.tsx`), exclusão restrita por RLS.
- A base de dados e fluxos existem — o que falta é a **camada de nomenclatura/UX**, não a funcionalidade.

**❌ Pendente:**
- **F1 — Renomeação completa:** nomenclatura antiga em todo o módulo. `CRM.tsx:241` `title="CRM"`; `:242` `description="Funil de vendas"`; `:245` `<Button>Novo Lead</Button>`; sidebar/navbar com "CRM"; rota `/crm` (não `/orcamentos`); entidade ainda `leads`. ~50 ocorrências de "CRM" + "Lead"/"Funil".
- **F3 — Criar cliente inline:** sem mini-formulário no `LeadFormDialog.tsx`.
- **F2 — `service_line_id` referenciando catálogo:** 🟡 `src/types/lead.ts:54` `service_line: string | null` (hardcoded). Tabela `service_lines` **não existe** — **bloqueado por Admin J4 (Tsuru)**.
- **F4 — Exclusão protegida:** 🟡 delete restrito por RLS; falta confirmação por digitação do nome.

## História de Usuário

**Como** GP Comercial de uma consultoria,
**quero** gerenciar "Oportunidades" num "Pipeline" (sem terminologia de vendas B2C) e criar o cliente sem sair do formulário,
**para que** eu registre uma oportunidade em menos de 60 segundos durante uma call, com a nomenclatura que faz sentido para o negócio.

## Contexto

Jornada de maior impacto (5/5) e Sprint 1. A auditoria confirma que a renomeação **não foi feita** — todo o módulo comercial (J3, J5, J7, J8, J11) ainda opera sobre "CRM/Lead/Funil". A renomeação é puramente texto/rota/entidade e **não depende do catálogo do admin**; deve ser feita primeiro para destravar a UI das demais jornadas. O `service_line_id` (F2) é a única parte bloqueada pela Tsuru. A criação de cliente inline conecta com GP-J1 (cadastro de clientes).

| Termo Antigo | Termo Novo |
|---|---|
| CRM | Orçamentos / Comercial |
| Lead | Oportunidade |
| Funil | Pipeline |
| /crm | /orcamentos |
| "Novo Lead" | "Nova Oportunidade" |

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Renomeação na interface (F1) — NÃO depende de Admin J4**
- Zero ocorrências de "Lead", "CRM" ou "Funil" na interface (busca case-insensitive nos textos visíveis).
- `CRM.tsx`: `title` → "Orçamentos"/"Comercial"; `description` → referência a "Pipeline"; botão → "Nova Oportunidade".
- Sidebar/navbar com o novo rótulo.

**CA-02 — Renomeação de rota (F1) — NÃO depende de Admin J4**
- Rota `/crm` → `/orcamentos`. Redirect de `/crm` para `/orcamentos` para não quebrar links salvos.
- Atualizar todos os `navigate`/`Link` internos.

**CA-03 — Renomeação de entidade/código (F1) — NÃO depende de Admin J4**
- Renomear a nomenclatura de domínio (tipos, services, hooks, componentes) de `lead`/`Lead` para `opportunity`/`Opportunity` onde refletir na UI/contratos, mantendo o comportamento.
- A renomeação de tabela/coluna no banco, se feita, via migration versionada com compatibilidade (sem perda de dados); se a renomeação física de tabela for arriscada no prazo, manter tabela e renomear apenas a camada de domínio/UI, documentando a decisão.

**CA-04 — Criar cliente inline (F3) — NÃO depende de Admin J4**
- No formulário de nova oportunidade, botão "+ Criar cliente" abre mini-formulário inline.
- Os dados já digitados na oportunidade são preservados ao abrir/salvar o cliente.
- Ao salvar o cliente, o campo de cliente da oportunidade é preenchido automaticamente.
- Reaproveita campos/validação de `clients` (alinhar com GP-J1); respeita `tenant_id`/RLS na criação.

**CA-05 — Estado vazio orientativo do seletor de Linha de Serviço (F2) — preparação**
- O seletor de Linha de Serviço, quando não houver linhas cadastradas, exibe estado vazio orientativo ("Nenhuma linha de serviço cadastrada pelo admin").
- Esta parte da UI pode ser feita sem o catálogo (apenas o componente e o estado vazio); o **vínculo real ao catálogo fica na Parte B (bloqueada)**.

### Parte B — Melhorias / bloqueadas pela Tsuru (depois)

**CA-06 — `service_line_id` referenciando catálogo (F2) — DEPENDE de Admin J4 (Tsuru) — BLOQUEADA até a migration**
- Trocar `service_line: string` por `service_line_id: uuid` referenciando `service_lines.id` (tabela criada pela migration do Admin J4).
- Seletor do formulário consome o catálogo do admin.
- **Bloqueada até a equipe Tsuru confirmar a migration do Catálogo de Serviços.**

**CA-07 — Exclusão protegida por digitação (F4)**
- Exclusão definitiva apenas para admin (RLS já restringe); GP arquiva (GP-J7) mas não exclui.
- Confirmação exige digitar o nome da oportunidade antes de habilitar o botão de exclusão.

## Fora do Escopo

- Modal de progressão por etapa e badges de "Parado" (isso é GP-J3).
- Distinção visual da timeline e follow-ups (GP-J5).
- Migração da nomenclatura em documentação/comentários internos que não aparecem na UI (opcional; não bloqueia o critério de sucesso).

## Notas Técnicas

- Página: `src/pages/CRM.tsx` (→ renomear referência); form: `src/components/crm/LeadFormDialog.tsx`; tipos: `src/types/lead.ts`; service `leadService.ts`; rota em `App.tsx`.
- F1/F2/F3/F4 cuidado: a renomeação física da tabela `leads` afeta J3/J5/J7/J8/J11 — coordenar; preferir renomear camada de domínio + alias antes de renomear coluna/tabela.
- Cliente inline reaproveita `ClientFormDialog`/`clientService` (ver GP-J1) — não duplicar lógica de cadastro.
- O catálogo (`service_lines`, `service_revenue_models`) **não existe no banco** hoje; qualquer código que dependa dele deve ficar atrás de feature-flag/guard até a migration da Tsuru.
- Respeitar `tenant_id`/RLS em criação inline e na exclusão.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Buscar "lead"/"crm"/"funil" na UI | Zero ocorrências na interface |
| Acessar `/crm` | Redireciona para `/orcamentos` |
| Abrir tela de Orçamentos | Título/botão com "Oportunidade"/"Pipeline" |
| Criar cliente inline na nova oportunidade | Cliente criado e selecionado; dados da oportunidade preservados |
| Falha ao criar cliente inline | Oportunidade mantém os dados digitados; erro claro |
| Seletor de Linha de Serviço sem catálogo | Estado vazio orientativo (sem quebrar) |
| `service_line_id` vinculado ao catálogo | **Bloqueado** até migration da Tsuru (Admin J4) |
| Excluir oportunidade como GP | Botão de exclusão definitiva indisponível (só arquivar) |
| Excluir como admin sem digitar nome | Botão bloqueado até digitar o nome correto |
