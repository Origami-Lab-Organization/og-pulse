# ADR 0033: Painel de uso é a única leitura entre tenants, e ela mora numa função

- Status: aceito
- Data: 2026-09-10
- Decisores: Italo Castro (produto), Origami Lab
- Relacionados: ADR-0027 (capacidade derivada de papel), ADR-0021 (RPC definer com guarda de
  tenant), ADR-0028 (plano de teste na RLS), PUL-227 (autocadastro), PUL-250 (guia do dono)

## Contexto

Desde o autocadastro (PUL-227), empresas entram sozinhas no Pulse. A Origami não tinha como
saber quem ativou, quem travou no primeiro dia e de quem o teste vence amanhã. A informação
existe, espalhada por cinco tabelas de cada cliente, e ninguém consegue lê-la: a RLS isola
por `tenant_id`, que é exatamente o que ela deve fazer.

O primeiro boundary do projeto diz, sem ressalva: **não expor dados entre tenants**. Um
painel de uso é, por definição, uma leitura entre tenants. Ou o boundary ganha uma exceção
registrada, ou o painel não existe.

A referência era o projete.app, que tem `/uso` com funil de ativação. Lá a autorização é
`email === 'italo@origamilab.com.br'`, com override por variável de ambiente, e o painel
lista nome, e-mail e WhatsApp de todos os usuários de cada escritório. Aquele produto não tem
RLS, então a aplicação é a única defesa e o e-mail é o que há. Aqui as duas condições são
diferentes: existe RLS, e existe vocabulário de capacidade.

## Decisão

### 1. A exceção existe, é uma só, e mora numa função

`public.platform_tenant_usage()`, `SECURITY DEFINER`. Nenhuma tela, hook ou policy do produto
passa a enxergar outro tenant. Quem quiser abrir uma segunda leitura entre tenants precisa de
outro ADR.

É o padrão de ADR-0021 invertido: lá o definer confina a chamada ao próprio tenant; aqui ele
confina **quem pode sair** dele.

### 2. Três travas, e as duas primeiras são dado, não código

1. `tenants.is_platform_owner`, com índice único parcial que garante **uma** linha `true` em
   toda a base. Não é `name ILIKE '%origami%'`: essa heurística já semeou dado no tenant
   errado, e a migration `20260910110000` existe só para consertar aquilo.
2. Capacidade `plataforma:ler-uso`, `is_sensitive`, num domínio novo `plataforma` — o
   primeiro que não pertence ao produto que o cliente usa, e sim à operação dele. **Fora de
   `default_role_capabilities`**: cliente novo não nasce com ela, hoje nem nunca.
3. A função exige as duas **juntas**. Conceder a capacidade no tenant de um cliente não abre
   nada, porque ela também confere que o tenant de quem chama é o dono da plataforma.

Escolhemos flag no banco em vez de e-mail em código por uma razão concreta: e-mail muda, pode
existir em mais de um tenant, e a checagem por e-mail do projete dá o poder a qualquer sessão
cujo endereço bata — inclusive uma conta criada dentro do tenant de um cliente.

### 3. O dado é pobre de propósito

A função devolve **contagem e data**. Nunca nome de projeto, nome de cliente final, valor de
contrato, margem, custo ou salário. O painel responde "este cliente está usando?", não "o que
este cliente está fazendo" — a segunda pergunta não é nossa, e o boundary de dado financeiro
vale para dado de cliente também.

A única exceção é o contato do administrador que criou a conta: nome, e-mail e telefone. É
dado pessoal e entra por finalidade declarada — é o contato comercial da conta, o mesmo que
`register-tenant` já envia ao comercial por e-mail (PUL-253). Os **demais** funcionários do
cliente aparecem só como número. Listar nome e WhatsApp de todo mundo, como o projete faz,
seria expor a lista de funcionários de terceiros sem finalidade.

### 4. O funil de ativação é a trilha do guia

Os oito marcos são, na ordem, os passos que o tsuru pede ao dono em PUL-250, mais três sinais
que só a plataforma vê: entrou, viu o tour e voltou depois do primeiro dia. Isso é regra, não
coincidência: **se a casa ensina A, B e C, a casa mede A, B e C**. Guia e painel divergentes
produzem um número que não diz se o guia funciona.

Empresa criada antes de 09/09/2026 fica fora da base do funil, e a tela diz quantas são. Elas
nasceram à mão ou de seed, sem passar por cadastro nem onboarding, e entrariam como "nunca
ativou" tendo dados. Aparecem na lista, porque existem, mas não distorcem o percentual.

### 5. O número que importa é a diferença entre entrar e criar

`last_sign_in_at` diz que alguém abriu a tela. `last_created_at` diz que alguém produziu
dado. Um cliente que entra toda semana e nunca cadastrou nada aparece saudável em qualquer
contador de login, e está morrendo. A tela marca esse caso com nome próprio.

## Consequências

- Benefícios: a Origami acompanha ativação e teste vencendo sem abrir o banco; o funil audita
  o guia de primeiros passos; a exceção ao isolamento é uma, nomeada e provada.
- Custos: existe uma função no banco que lê todos os tenants, e ela é o alvo de maior valor
  para quem quiser dado de cliente. Cada linha do painel varre cinco tabelas por tenant, sem
  paginação — aceitável em dezenas de clientes, precisa de vista materializada em centenas.
- Riscos: se alguém marcar `is_platform_owner` no tenant errado, esse tenant passa a ver
  todos. O índice único limita o estrago a um, e a flag não é editável por tela nenhuma.
- Como reverter: `supabase/rollback/20260910180000_platform_usage_rollback.sql` derruba a
  função e revoga a capacidade; o painel passa a responder erro.

## Pendências

- Sem registro de acesso: não fica gravado quem abriu o painel e quando. Para uma leitura
  entre tenants, auditoria é o próximo passo natural.
- Sem paginação nem filtro de período.
- A exclusão de tenant NÃO está aqui, de propósito. No projete ela vive no mesmo painel,
  atrás de um ícone de lixeira ao lado das métricas. Apagar a conta de um cliente merece
  outra tela e outra confirmação.

## Evidências

- Migration `supabase/migrations/20260910180000_platform_usage.sql`, com rollback.
- Prova em Postgres 15, oito cenários: a flag escolhe o Origami com mais funcionários e não o
  homônimo vazio; o banco recusa um segundo tenant dono; o admin da casa lê; o tenant da casa
  não aparece como cliente; o contato exposto é só o do admin; o admin de um cliente é
  recusado; continua recusado mesmo com a capacidade concedida no tenant dele; e sessão
  anônima é recusada.
- Leitura em produção como o admin da casa: quatro clientes listados, e o que se cadastrou no
  mesmo dia aparece com acesso feito e nenhuma criação — o caso que o painel existe para pegar.
- `.harness/capability-matrix.md`, seção Plataforma.
