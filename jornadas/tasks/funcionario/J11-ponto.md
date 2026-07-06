# FUNC-J11 — Ponto do Trabalho

> Jornada: Funcionário J11 · Estado auditado: ❌ NÃO EXISTE (0%)
> Dependências externas: campo `tipo_contratacao` em `employees` (CLT/ESTAGIO/MENOR_APRENDIZ/SOCIO/PJ) e `jornada_diaria` — confirmar/coordenar com Pessoas. Geolocalização e IP dependem do browser/PWA (J12).

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Nada. Confirmado: sem rota `/ponto`; tabelas `time_records` e `monthly_timesheet_signatures` ausentes (0 em 254 migrations); sem geolocalização; sem filtro de menu por `tipo_contratacao`.

**❌ Pendente:**
- Tudo: as duas tabelas, página `/ponto`, registro com geo/IP, visão mensal, edição com justificativa, assinatura mensal imutável, desbloqueio admin, banco de horas (CLT) e bloqueio de extras (estagiário/menor).

## História de Usuário

**Como** Funcionário CLT, Estagiário ou Menor Aprendiz,
**quero** registrar entrada e saída em segundos de qualquer dispositivo e assinar minha folha mensal,
**para que** meu ponto fique em dia, legalmente correto e imutável após a assinatura.

## Contexto

J11 é grande e do zero. Aplica **apenas** para CLT, Estagiário e Menor Aprendiz (Sócio/PJ cobertos por contrato e não veem o menu). Por ser extensa, está dividida em 3 subtasks numeradas neste arquivo. Ordem recomendada: J11.1 → J11.2 → J11.3. Boundary crítico: geolocalização, IP e CPF são dados sensíveis — nunca logar valores; registros assinados são imutáveis (garantido por RLS, não só pela UI).

---

## FUNC-J11.1 — Ponto básico (registro + visão mensal + edição)

### Critérios de Aceite — Parte A (do zero)

**CA-01 — Migration `time_records`**
- Colunas: `id`, `tenant_id`, `employee_id`, `type` (entry/exit), `recorded_at`, `latitude`, `longitude`, `ip_address`, `device_info`, `is_manual_edit`, `original_recorded_at`, `edit_justification`, `edited_at`, `edited_by`.
- RLS: funcionário lê/escreve apenas os próprios registros do seu `tenant_id`; admin com escopo de gestão.

**CA-02 — Filtro de menu por tipo de contratação**
- Menu `/ponto` visível apenas para `tipo_contratacao IN ('CLT','ESTAGIO','MENOR_APRENDIZ')`.
- Sócio/PJ não veem o menu; acesso a `/ponto` via URL direta por PJ/Sócio não renderiza o módulo (guard + RLS).

**CA-03 — Botão de bater ponto**
- Botão grande e central com estados: sem registro hoje → "Registrar Entrada" (verde); após entrada → "Registrar Saída" (laranja) + tempo decorrido; após saída → "Jornada encerrada" + total + "Registrar nova entrada" (intervalos).
- Ao clicar: grava `recorded_at: now()`, solicita `navigator.geolocation`, captura IP e `device_info`. Registro em < 1s.
- Debounce/anti-duplo-clique para não gerar dois registros.

**CA-04 — Geolocalização opcional**
- Geo negada pelo browser: registro ainda funciona com `latitude/longitude = null` (flag), sem bloquear o ponto.

**CA-05 — Visão mensal**
- Tabela do mês: data, entrada, saída, total, status (✓ / ⚠️ saída pendente / Feriado). Total do mês no rodapé.

**CA-06 — Edição com justificativa (até o último dia do mês)**
- Dialog: horário editável + justificativa obrigatória (mín. 10 caracteres).
- Ao salvar: `is_manual_edit: true`, `original_recorded_at` preservado, `edit_justification`, `edited_at`, `edited_by` registrados.
- Edição bloqueada se o mês já estiver assinado (ver J11.2).

---

## FUNC-J11.2 — Assinatura mensal imutável + desbloqueio admin

### Critérios de Aceite — Parte A (do zero)

**CA-07 — Migration `monthly_timesheet_signatures`**
- Colunas: `id`, `tenant_id`, `employee_id`, `reference_month`, `signed_at`, `signed_name`, `signed_cpf`, `ip_address`, `latitude`, `longitude`, `is_admin_unlocked`, `unlocked_at`, `unlock_justification`.
- RLS: assinatura criada apenas pelo próprio funcionário; após assinada, `time_records` do mês ficam imutáveis (policy de `UPDATE`/`DELETE` negada para o mês assinado).

**CA-08 — Banner de assinatura (a partir do dia 25)**
- "Seu mês se encerra em X dias. Revise e assine sua folha."

**CA-09 — Fluxo de assinatura**
1. Resumo do mês (todas entradas/saídas).
2. Checklist de pendências (dias sem saída, discrepâncias).
3. Confirmação: nome completo (deve coincidir exatamente com o cadastro), CPF, checkbox de confirmação.
4. Grava `signed_at`, `signed_name`, `signed_cpf`, `ip_address`, `latitude/longitude`.
- Após assinar: registros imutáveis; botões de edição desaparecem.

**CA-10 — Desbloqueio pelo admin**
- Admin desbloqueia a folha com justificativa obrigatória (`is_admin_unlocked`, `unlocked_at`, `unlock_justification`).
- Funcionário notificado (Inbox J3 já disponível); deve reassinar após a correção.

---

## FUNC-J11.3 — Banco de horas (CLT) + bloqueio de extras (estagiário/menor)

### Critérios de Aceite — Parte A (do zero)

**CA-11 — Bloqueio de extras para Estagiário/Menor Aprendiz**
- Registro que ultrapassaria `jornada_diaria` é bloqueado com mensagem: "Este registro excederia a jornada máxima permitida por lei. A realização de horas extras pode descaracterizar o vínculo contratual. Consulte o DP."

**CA-12 — Banco de horas (apenas CLT)**
- Horas além da `jornada_diaria` exigem aprovação do GP ou Admin antes de entrar no banco.
- Prazo de 6 meses para compensar via folga.
- No 7º mês sem compensar: vira custo na folha do mês com adicional de 50% (dias úteis) ou 100% (domingos/feriados).

**CA-13 — Visibilidade do saldo**
- Funcionário CLT vê saldo do banco de horas e prazos de compensação na visão mensal.

### Parte B — Melhorias no existente (depois)

**CA-14 — Integração com Inbox**
- Notificações de aprovação de extra, desbloqueio de folha e lembrete de assinatura usam tipos da Caixa de Entrada (J3).

## Fora do Escopo

- Aprovação de extras com workflow completo de múltiplos níveis (MVP: GP ou Admin).
- Geofencing/validação de local de trabalho (apenas captura de geo, sem cerca).
- Integração com folha de pagamento real (custo no 7º mês é cálculo, não baixa contábil).
- Fila offline para bater ponto — exige conexão (ver J12 F6).

## Notas Técnicas

- Boundary: geo, IP e CPF são sensíveis — nunca logar; mascarar CPF em telas quando possível.
- Imutabilidade pós-assinatura é garantida por RLS, não apenas escondendo botões.
- `recorded_at` é a fonte de verdade do horário; `original_recorded_at` nunca é sobrescrito em edição.
- Reaproveitar cálculo de dias úteis/feriados já existente (`useHolidays`/`countWorkingDays`) para status e adicional de banco de horas.
- Layout mobile do botão e da tabela detalhado em J12 (PWA).

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Bater entrada e saída | Cada registro < 3s; geo e IP capturados |
| Clique duplo rápido | Debounce evita dois registros |
| Geo negada pelo browser | Registro salvo com `latitude: null`, sem travar |
| PJ/Sócio acessa `/ponto` via URL | Módulo não renderiza; menu ausente |
| Editar registro com justificativa | `original_recorded_at` preservado, `is_manual_edit: true` |
| Assinar mês | Registro de assinatura com todos os campos; folha imutável |
| Editar mês já assinado via API | RLS bloqueia |
| Admin desbloqueia folha | Funcionário notificado; reassinatura exigida |
| Estagiário excede `jornada_diaria` | Registro bloqueado com mensagem legal |
| CLT acumula extra aprovada | Entra no banco; saldo visível; 7º mês vira custo c/ adicional |
