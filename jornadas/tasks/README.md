# Tasks do Hackathon — Equipe Hana

Specs de task geradas a partir da [auditoria de código](../AUDITORIA-ESTADO-ATUAL.md), cobrindo as **21 jornadas** das personas **Funcionário/Consultor** e **GP Comercial**.

**Regra de execução:** cada task separa **Parte A — Pendente** (desenvolver primeiro) de **Parte B — Melhorias** (no que já existe). Jornadas já prontas focam em Parte B; jornadas do zero são quase só Parte A.

> Cada arquivo é uma task autocontida no formato: História → Estado Atual (auditado) → Contexto → Critérios de Aceite (A/B) → Fora do Escopo → Notas Técnicas → Critérios de Teste.

---

## Funcionário / Consultor (12)

| Task | Estado auditado | Foco principal | Dep. externa |
|------|----------------|----------------|--------------|
| [FUNC-J1](funcionario/J1-convite-primeiro-acesso.md) | 🟡 PARCIAL | Tela `/primeiro-acesso`, e-mail, expiração de link | — |
| [FUNC-J2](funcionario/J2-onboarding.md) | ❌ DO ZERO | `onboarding_completed`, página 3 passos, guard, banner | — |
| [FUNC-J3](funcionario/J3-caixa-de-entrada.md) | ✅ PRONTA | Melhorias: tipos de notificação, `read_at`, `action_url` | — |
| [FUNC-J4](funcionario/J4-meu-kanban.md) | 🟡 PARCIAL | Movimento bidirecional, `project_column_status_mapping`, filtros | **GP Projetos (Koi)** |
| [FUNC-J5](funcionario/J5-meus-projetos.md) | ✅ PRONTA | Fase planejamento, próximo marco, widget no dashboard | — |
| [FUNC-J6](funcionario/J6-navegacao-execucao-projeto.md) | 🟡 PARCIAL | Filtro "apenas meus cards", Roadmap↔Kanban | **GP Projetos (Koi)** |
| [FUNC-J7](funcionario/J7-timesheet.md) | 🟡 PARCIAL | Pré-preenchimento (`useTimesheetPrefill`), sugestão/lançado | — |
| [FUNC-J8](funcionario/J8-reembolso.md) | ✅ PRONTA | Impacto nos custos do projeto, câmera mobile | — |
| [FUNC-J9](funcionario/J9-documentos.md) | ❌ DO ZERO | `employee_documents`, bucket, página `/documentos` | **Pessoas (holerite)** |
| [FUNC-J10](funcionario/J10-perfil-funcionario.md) | ❌ DO ZERO | `/meu-perfil`, PIX/banco/endereço, ViaCEP, avatar | — |
| [FUNC-J11](funcionario/J11-ponto.md) | ❌ DO ZERO | Ponto (geo/IP), assinatura mensal, banco de horas | — |
| [FUNC-J12](funcionario/J12-pwa.md) | ❌ DO ZERO | PWA: manifest, ícones, install, offline | — |

## GP Comercial (9)

| Task | Estado auditado | Foco principal | Dep. externa |
|------|----------------|----------------|--------------|
| [GP-J1](gp-comercial/J1-cadastro-clientes.md) | 🟡 PARCIAL | Campos de contato em `clients`, página `/clients/:id` | — |
| [GP-J2](gp-comercial/J2-renomeacao-oportunidades.md) | ❌ ~10% | Renomear CRM→Oportunidades, rota, cliente inline | **Admin J4 (Tsuru)** ¹ |
| [GP-J3](gp-comercial/J3-pipeline-progressao.md) | 🟡 PARCIAL | Modal de pré-requisitos, badge "Parado", visão por empresa | **Admin J4 (Tsuru)** ¹ |
| [GP-J4](gp-comercial/J4-orcamentacao-modelos.md) | 🟡 PARCIAL | Modelos Indicação/Equity/Combinações | **Admin J4 (Tsuru)** ¹ |
| [GP-J5](gp-comercial/J5-comentarios-followup.md) | 🟡 PARCIAL | Follow-up vencido no card, timeline 3 tipos, anexos | — |
| [GP-J7](gp-comercial/J7-arquivamento-exclusao.md) | 🟡 PARCIAL | Campo concorrente, seleção de etapa na restauração | — |
| [GP-J8](gp-comercial/J8-negocio-fechado.md) | 🟡 PARCIAL (~80%) | "Distribuir igualmente", celebração/confetti | — |
| [GP-J9](gp-comercial/J9-anexo-contrato.md) | ❌ DO ZERO (UI) | Step de upload de contrato pós-fechamento | GP-J8 (interna) |
| [GP-J11](gp-comercial/J11-analytics-comercial.md) | 🟡 PARCIAL | Tempo por etapa, win rate, KPI "precisam de atenção" | GP-J7 (interna) ² |

¹ Apenas a parte de catálogo/margem (CAs marcadas na Parte B). A renomeação e os modelos de receita **não** dependem da Tsuru.
² O gráfico de concorrentes depende do campo `competitor_name` entregue em GP-J7.

---

## Mapa de dependências (ordem sugerida)

**Bloqueadores internos — fazer cedo (destravam outras):**
1. **GP-J2** (renomeação) — a parte de texto/rota destrava a UI de J3/J5/J7/J8/J11. Não depende da Tsuru.
2. **GP-J1** (campos de contato + `/clients/:id`) — destrava a "visão por empresa" de GP-J3.
3. **GP-J7** (campo `competitor_name`) — destrava o gráfico de concorrentes de GP-J11.

**Dependências externas — coordenar / não bloquear:**
- **Admin J4 (Tsuru):** catálogo `service_lines`/`service_revenue_models` → libera GP-J2 (F2), GP-J3 (Linha de Serviço), GP-J4 (margem mínima). Fazer o resto sem esperar.
- **Pessoas (folha):** holerites → FUNC-J9 (a tab Holerites depende do DP processar a folha; o resto da página pode ser feito).
- **GP Projetos (Koi):** board de atividades + mapeamento de colunas → FUNC-J4 e FUNC-J6 (CAs marcadas).

**Encadeamento interno:**
- FUNC-J1 → FUNC-J2 (onboarding só faz sentido após o primeiro acesso)
- GP-J8 → GP-J9 (anexo de contrato é step pós-fechamento)
- FUNC-J3 (✅ pronta) é base para notificações de FUNC-J7/J8/J9

---

## Legenda
- ✅ PRONTA — implementada; task foca em melhorias (Parte B)
- 🟡 PARCIAL — existe parcialmente; Parte A fecha os gaps, Parte B melhora
- ❌ DO ZERO — não existe; quase tudo é Parte A

> [QUICK-WINS.md](QUICK-WINS.md) é um recorte curado dos 7 gaps de maior valor das parciais — o conteúdo foi absorvido e expandido nas tasks por jornada acima (que são a fonte canônica).
