# ADR 0020: Identidade de colega vem de diretório com projeção fixa, não de policy de linha

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

A tabela `employees` guarda, na mesma linha, identidade (nome, cargo, foto, e-mail),
remuneracao (`salario_mensal`, `salario_liquido`, `pro_labore`, `dividendos`,
`valor_contrato_pj`, `bolsa_auxilio`, encargos e provisoes,
`total_monthly_cost_estimated`) e dado pessoal sensivel (`cpf`, `data_nascimento`,
`telefone`, dados bancarios e PIX).

A policy `Employees can view project co-members` (migration `20260512200000`) concedia
SELECT a quem compartilhasse projeto. O comentario da propria migration declara a
intencao: *"Allow regular employees to view basic info of other employees ... so
assignee dropdowns can show names"*. A intencao estava correta; o mecanismo nao.
RLS e row-level: aprovado o `USING`, todas as colunas ficam legiveis. Qualquer
funcionario com um projeto em comum lia salario, custo, CPF e conta bancaria de
colegas direto pela API, sem passar por tela.

O levantamento de consumidores encontrou 16 pontos no frontend que dependiam dessa
policy para exibir identidade de terceiros, e mostrou que o conjunto realmente
consumido pela UI e de apenas cinco campos: `id`, `nome`, `cargo`, `foto_url`,
`email`. O caso mais grave era o seletor de convidados de evento
(`AttendeePicker`), que chamava `employeeService.getAll` com `select("*")` e
renderizava somente nome e e-mail — a linha inteira, com salario e dados bancarios,
trafegava ate o browser para montar um dropdown.

Alternativas consideradas:

- **Privilegio por coluna** (`REVOKE SELECT (coluna)`): nao funciona neste modelo.
  No Supabase todo usuario autenticado usa o mesmo role `authenticated`; admin se
  distingue por `user_roles`/RLS, nao por role de banco. Alem disso quebraria
  `select("*")` usado pelas telas de admin.
- **Mover colunas sensiveis para tabela-filha**: estruturalmente superior e deixa
  `employees` seguro por construcao, mas move ~27 colunas e toca a matematica de
  folha, versionamento e desligamento. Risco de erro financeiro silencioso
  desproporcional para uma correcao de seguranca.
- **View com `security_invoker`**: nao existe view no projeto e o embedding do
  PostgREST (`employee:employees(...)`) nao aponta para view sem retrabalho maior.

## Decisao

Identidade de terceiros passa a ser servida por **funcao `SECURITY DEFINER` com
projecao fixa**, e a policy de linha que concedia a tabela inteira e removida.

- `get_employee_directory()` retorna `id`, `nome`, `cargo`, `foto_url`, `email`,
  `status` para o tenant do chamador. O tenant e **derivado de `auth.uid()`**, nunca
  recebido como parametro — remove por construcao a classe de bug de RPC que confia
  no `tenant_id` do chamador.
- `get_tenant_admin_employee_ids()` retorna apenas ids, para o fluxo de ferias
  resolver aprovadores sem ler `employees` de terceiros.
- SELECT em `employees` fica restrito ao proprio registro e a admin/gerente do
  tenant, pelas policies que ja existiam.
- O escopo do diretorio e o **tenant inteiro**, nao apenas co-membros de projeto.

O padrao nao e novo: `get_project_assignable_members` (migration `20260520120000`)
ja fazia exatamente isso para o dropdown do quadro de atividades, inclusive
documentando que a policy de co-membro escondia o gerente.

Onde a consulta embute `employee`/`manager` e o campo financeiro so deve chegar a
admin/gerente (detalhe de projeto, alocacoes), o embed e mantido e a identidade e
preenchida pelo diretorio apenas quando o embed vem vazio por RLS
(`withDirectoryIdentity`). Assim o comportamento de admin/gerente permanece
identico e o de funcionario comum passa a funcionar sem receber custo.

## Consequencias

- Beneficios:
  - Remuneracao, custo e dado pessoal deixam de ser legiveis por colega de projeto.
    A protecao passa a ser estrutural: a projecao e fixa, entao coluna sensivel nova
    na tabela nao vaza por esquecimento.
  - Mitiga OWASP A01 (Broken Access Control) e reduz superficie LGPD.
  - Corrige dois defeitos preexistentes: o nome do aprovador de ferias aparecia como
    "Desconhecido" quando o admin nao era co-membro, e o seletor de convidados so
    enxergava co-membros quando o objetivo e convidar qualquer pessoa da empresa.
  - Identidade (nome/cargo/foto/e-mail) fica explicitamente separada de dado
    financeiro — a mesma separacao que a PUL-164 aplica ao financeiro de projeto.
- Custos:
  - 16 pontos do frontend passaram a resolver identidade pelo diretorio em vez do
    embed. Novas telas que precisem de nome de terceiro devem usar
    `useEmployeeDirectory`/`getEmployeeDirectoryMap`, nao `employees(...)` aninhado.
  - Uma consulta adicional por fluxo, mitigada por cache compartilhado de 10 minutos
    na chave `['employee-directory']`.
- Riscos:
  - Telas que ainda embutam `employees(...)` para funcionario comum passam a receber
    `null` e perdem nome/avatar. O levantamento cobriu os 16 pontos conhecidos; um
    ponto nao mapeado se manifesta como nome vazio, nao como vazamento.
  - O diretorio expoe identidade de todo o tenant a qualquer funcionario. Foi decisao
    consciente: e estritamente menos dado do que a policy anterior concedia.
- Como reverter:
  - Recriar a policy `Employees can view project co-members` com o mesmo `USING`
    (`user_shares_project_with_employee`, mantida no banco). O frontend continua
    funcionando com o diretorio; a reversao apenas volta a conceder a linha inteira.

## Evidencias

- Migration: `supabase/migrations/20260817200000_employees_directory_and_column_privacy.sql`
- Policy removida: `supabase/migrations/20260512200000_employees_view_project_comembers.sql`
- Padrao precedente: `supabase/migrations/20260520120000_project_assignable_members_rpc.sql`
- Contrato: `src/types/employeeDirectory.ts`; acesso: `src/services/employeeDirectoryService.ts`,
  `src/hooks/useEmployeeDirectory.ts`
- Jira: PUL-162 (epico PUL-161)
- Verificacao executada: `npx tsc --noEmit`, `npx eslint` (sem regressao sobre a
  baseline dos arquivos tocados) e `npm run build`. Testes automatizados nao foram
  escritos nesta mudanca por decisao explicita do dono do projeto na sessao.
- Prova pendente: teste negativo em banco (funcionario comum nao le coluna sensivel
  de colega) depende de ambiente Supabase local, hoje bloqueado — ver TD do
  `supabase start` no `.harness/tech-debt/log.md`.
