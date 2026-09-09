# ADR 0031: Centro de custo como âncora de custo e receita; catálogo e atividades internas preservados

- Status: proposto (decisões de produto de 08 e 09/09/2026 já tomadas; duas perguntas em aberto, marcadas abaixo)
- Data: 2026-09-10
- Decisores: Italo Castro (produto); registro e implementação em PUL-216, PUL-217, PUL-218, PUL-219, PUL-220, PUL-221

## Contexto

Hoje a hora do Pulse tem dois destinos possíveis e um deles é cego. Hora de projeto vai para
`project_timesheets`, ligada ao projeto. Todo o resto cai num balde genérico, "Atividades
internas" (`activity_types` + `activity_timesheets`), sem dizer a que frente da empresa
pertence. O diagnóstico de PUL-182 é direto: **a hora não lançada não deixa de ser paga, ela
apenas some da leitura de custo.** Comercial, marketing e administrativo aparecem mais
baratos do que são.

Leitura de produção em 09/09/2026 (tenant `93e40db0`, o real da Origami):

- **10 serviços** em uma única linha de serviço ("Serviços Gerais"), com duplicatas
  deliberadas: "Consultoria Estratégica" existe duas vezes (uma `fixed`, uma `recurring`) e
  "Ventures" três vezes (`fixed`, `success_fee` e uma sem modelo). A casa **duplica o
  serviço para representar modelos de cobrança diferentes**.
- **7 atividades internas**, com 1.353 horas lançadas: Marketing (812 h), Administrativo
  (197 h), Comercial (178 h), Folga/Férias (77 h), Hackaton (52 h, inativa), RH/DP (27 h,
  inativa), Atestado Médico (10 h).
- `projects.service_line` é `text` e **não guarda linha de serviço: guarda `service_id`**.
  21 dos 23 projetos apontam para um serviço por esse campo; 2 guardam o texto legado
  `product_studio`. O nome da coluna mente, e isso é bom para nós: o elo projeto → serviço
  já existe de fato, o que aproxima a leitura de receita por centro.

Restrições que moldaram a decisão:

- `boundaries.md`: feature nasce com a capacidade que a governa; mudança de policy exige
  migration, teste e ADR; nomenclatura da interface é Oportunidade e Pipeline.
- ADR-0003: o catálogo é hierárquico (Linha → Serviço → Modelo de Cobrança) e nada se
  apaga; `services.billing_type` convive, redundante, com `service_revenue_models`.
- ADR-0027: capacidade não expressa escopo; tenant nunca é configurável pelo próprio
  mecanismo de capacidades.

## Decisão

### 1. O centro de custo é a âncora (08/09/2026)

Cada **item** — serviço do catálogo ou atividade interna — pertence a **um** centro de
custo. A hora lançada em um item carrega o centro **do item**. Custo se lê por centro
(horas × custo/hora da pessoa); receita chega pelo serviço que o projeto ou a oportunidade
vende.

Consequência prática para quem lança hora: a tela pergunta **o item**, e o centro vem dele.
Um seletor a menos.

Alternativas descartadas:

- **Centro na pessoa.** Rejeitada: a mesma pessoa trabalha em frentes diferentes no mesmo
  dia; o centro da pessoa mediria lotação, não onde a hora foi gasta. A associação pessoa ×
  centro continua existindo (PUL-218), mas para dizer **onde ela pode lançar**, não para
  classificar a hora.
- **Centro no lançamento, escolhido a cada hora.** Rejeitada: dois seletores por linha na
  grade semanal, e nada garantiria coerência entre item e centro.
- **Centro no projeto.** Rejeitada como regra geral: não resolve a hora fora de projeto, que
  é exatamente o buraco de PUL-182. Fica como pergunta aberta (P4) para a hora de projeto.

### 2. O catálogo fica como está (09/09/2026)

Nenhum cadastro novo, nenhuma unificação. O que entra é o **campo de centro** em
`services` e em `activity_types`.

- **"Tipo" já existe**: é o **Tipo de modelo** do passo "Modelo de Cobrança" do wizard de
  serviço, gravado em `service_revenue_models.model_type` (`fixed`, `recurring`,
  `success_fee`, `indication`, `equity` e combinações). Não se cria nada.
- **A marcação serviço/atividade não é campo**: vem do cadastro de origem. Item do catálogo
  de Serviços **cobra hora**; item de Atividades Internas **desconta hora**.
- **Duplicatas do catálogo são preservadas.** "Consultoria Estratégica" (fixed) e
  "Consultoria Estratégica" (recurring) são dois serviços com projetos distintos apontando
  para cada um. Unificá-las exigiria decidir o que fazer com os modelos de cobrança e
  reescrever `projects.service_line` em 21 projetos. Fica fora desta onda.

### 3. A hora grava o centro do momento do lançamento

O centro fica **persistido na hora**, não resolvido por join em tempo de leitura. Mover um
item de centro afeta somente lançamentos futuros; o histórico não é reescrito. Sem isso, uma
troca de centro em 2027 reclassificaria retroativamente o custo de 2026 e nenhum fechamento
passado fecharia de novo.

### 4. Capacidades

- **Cadastro do centro de custo** (`cost_centers`): escrita por **`configuracao:editar`**,
  a capacidade dos cadastros-base do tenant (feriados, benefícios, ferramentas, config.
  financeira, modelos de receita). No seed, só Admin. Leitura para todo membro do tenant:
  quem lança hora precisa ver a lista. Sem DELETE — centro sai de uso por `is_active`.
  Entregue em PUL-217.
- **Campo de centro no item**: herda a capacidade do cadastro onde o campo vive, isto é
  **`catalogo:editar`** para serviço e para atividade interna. Não se cria capacidade para
  um campo: quem pode editar o serviço pode dizer de que centro ele é.

**Divergência que isso expõe (P2, aberta):** em produção, `catalogo:editar` está habilitada
para **Admin e Gerente**, mas a tela de Serviços restringe a ação a admin (`canManage =
isAdmin`). A ata de 21/08 diz "Administrador". As duas saídas coerentes são alinhar a tela
ao banco (gerente edita, porque quem vende o serviço sabe de que estúdio ele é) ou remover
`catalogo:editar` do Gerente por toggle em `role_capabilities`. **Recomendação: alinhar a
tela ao banco.** Manter `if (isAdmin)` na tela enquanto o banco permite gerente é a pior das
três opções, porque deixa a regra em dois lugares que discordam.

### 5. Mapa de migração dos itens existentes (PUL-220)

Destino de cada item do tenant real, decidido a partir do nome e dos projetos que apontam
para ele. **Nada é apagado**; itens inativos seguem inativos, só ganham centro para o
histórico ficar legível.

| Serviço (id curto) | Modelo | Projetos que apontam | Centro de destino |
|---|---|---|---|
| Consultoria Estratégica (`3e79de15`) | fixed | 3 | SL04 Consultoria Estratégica |
| Consultoria Estratégica (`a5fd980f`) | recurring | 2 | SL04 Consultoria Estratégica |
| Financiamento da Inovação (`ad096345`) | success_fee | 2 | SL01 Financiamento de Inovação |
| Lei do Bem (`a055dc6f`) | success_fee | 0 | SL01 Financiamento de Inovação |
| Product Studio (`4014bc78`) | fixed | 7 | SL02 Studio de Produto |
| Programa de Inovação (`c02e2c1b`) | fixed | 0 | SL04 Consultoria Estratégica *(a confirmar: pode ser SL01)* |
| Sprint 0 (`a5a9098a`) | fixed | 0 | SL02 Studio de Produto |
| Ventures (`0135c470`) | sem modelo | 6 | SL03 Ventures |
| Ventures (`7ca1fc4d`) | success_fee | 1 | SL03 Ventures |
| Ventures (`f1684f78`) | fixed | 0 | SL03 Ventures |

| Atividade interna | Horas | Estado | Centro de destino |
|---|---|---|---|
| Marketing | 812 h | ativa | OG001_Comercial/Marketing |
| Administrativo | 197 h | ativa | OG001_Administrativo |
| Comercial | 178 h | ativa | OG001_Comercial/Marketing |
| Folga/Férias | 77 h | ativa | **ausência — ver P3** |
| Hackaton | 52 h | inativa | OG001_Administrativo (evento interno) |
| RH/DP | 27 h | inativa | OG001_Administrativo |
| Atestado Médico | 10 h | ativa | **ausência — ver P3** |

A única linha de serviço existente ("Serviços Gerais") não recebe centro: centro vive no
item, não na linha. O centro **105 Coworking** nasce sem item apontando para ele, o que é
esperado.

## Consequencias

- Benefícios: um lugar para ler custo por frente da empresa; quem lança hora escolhe uma
  coisa em vez de duas; o histórico não é reescrito quando o cadastro muda; catálogo e
  atividades internas seguem íntegros, sem migração de forma.
- Custos: um item pertence a um centro só. Se o mesmo serviço passar a ser vendido por dois
  estúdios, viram dois serviços — o que já é o padrão de fato da casa para modelos de
  cobrança diferentes. A leitura de **receita** por centro depende do elo projeto → serviço,
  hoje guardado em `projects.service_line` como texto com `service_id` dentro; enquanto essa
  coluna não for saneada, a receita por centro é derivada por conversão de texto.
- Riscos: **`name ILIKE '%origami%'` não identifica o tenant da casa** — existem dois
  tenants "Origami Lab" em produção, e o mais antigo está vazio. O seed de PUL-217 caiu no
  errado e foi corrigido pela migration `20260910110000`, que passa a escolher o tenant
  Origami com mais funcionários. As migrations `20260615120000` e `20260411230000` usam o
  critério antigo e acertaram por sorte da ordem física das linhas.
- Como reverter: os campos de centro no item são aditivos e anuláveis; remover a coluna e o
  centro persistido na hora devolve o comportamento atual, com o balde "Atividades internas"
  intacto.

## Criterio de revisao

- Quando a receita por centro entrar (PUL-176 / PUL-195): aí `projects.service_line` precisa
  virar `service_id` de verdade, com FK, e este ADR ganha um sucessor.
- Se a casa passar a vender o mesmo serviço por dois estúdios: revisar "um item, um centro".
- Se as leituras que hoje separam "projeto × atividades internas" (KPI de % de atividades
  internas, evolução, painel de alocação) forem reescritas por centro.

## Perguntas abertas (produto)

- **P2 — Quem edita o centro do item.** Ver decisão 4. Recomendação: alinhar a tela ao banco.
- **P3 — Ausências.** Folga/Férias e Atestado Médico são hora **não trabalhada**. Mandá-las
  para um centro produtivo distorce a margem daquele centro; mandá-las para
  OG001_Administrativo distorce o administrativo com as férias de toda a empresa.
  **Recomendação: um centro dedicado, `OG000 Ausências`**, excluído das leituras de custo
  produtivo. Custa uma linha no seed e mantém intacta a regra "todo item tem um centro".
- **P4 — Hora de projeto e centro.** A hora de projeto herda o centro pelo serviço que o
  projeto vende, ou o projeto tem centro próprio? Não bloqueia PUL-218 a PUL-222.

## Evidencias

- Jira: PUL-214 e PUL-215 (épicos da onda), PUL-216 (este registro), PUL-217 (cadastro
  entregue), PUL-218, PUL-219, PUL-220, PUL-221, PUL-222; origem em PUL-180 e PUL-181;
  diagnóstico em PUL-182.
- Banco: `supabase/migrations/20260910100000_cost_centers.sql` e a correção de tenant
  `20260910110000_cost_centers_seed_fix_tenant.sql`.
- Leitura de produção somente-leitura em 09/09/2026 (pooler, tenant `93e40db0`): contagens de
  serviços, modelos, atividades, horas e o conteúdo de `projects.service_line`.
- Relacionados: ADR-0003 (catálogo), ADR-0008 (`employees` sem departamento), ADR-0023
  (leituras por papel), ADR-0027 (capacidade por papel).
