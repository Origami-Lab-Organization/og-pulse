# Guarda DEFERRED bloqueava todo autocadastro — 10/09/2026

## Sintoma

Toda tentativa em `/register` respondia "Erro ao criar empresa. Tente novamente." O log da
Edge Function trazia a causa real:

```
register-tenant: erro ao criar tenant: A operacao deixaria este tenant sem ninguem
capaz de gerir perfis (pessoa:editar-papel).
```

Chegou por outro caminho: o Italo tentou cadastrar a SyngularID em 09:33 e bateu no limite
de tentativas (PUL-255). Ao investigar por que as três tentativas anteriores não tinham
criado tenant nenhum, o defeito de verdade apareceu.

## Causa

`assert_tenant_keeps_profile_admin` (PUL-204) é CONSTRAINT TRIGGER DEFERRABLE INITIALLY
DEFERRED, avaliado no COMMIT. A escolha está certa para o seed poder passar por estados
intermediários — e funciona quando tudo acontece **numa transação só**.

Mas `register-tenant` fala com o PostgREST, e cada passo é uma requisição HTTP, logo uma
transação que comita sozinha:

| passo | o que acontece |
|---|---|
| 1 | `INSERT` em `tenants` → trigger semeia `tenant_roles` e `role_capabilities` → **COMMIT**. A guarda avalia aqui e procura alguém em `user_tenant_roles` com a capacidade. Não há: o tenant acabou de nascer. |
| 2 | cria usuário no Auth (requisição seguinte) |
| 3 | cria o funcionário (requisição seguinte) |
| 4 | `INSERT` em `user_tenant_roles` com o papel Admin — só aqui a pessoa aparece |

O passo 1 nunca chegava ao passo 4. **Nenhuma empresa foi criada por autocadastro desde
02/09**, quando a guarda entrou; o último tenant da base era de março, feito pelo seed de
demonstração. PUL-227 foi entregue sem prova de ponta a ponta e o defeito ficou oito dias
em produção, invisível porque ninguém tentava se cadastrar.

## Por que a prova em transação desfeita não pegou

Provar migration com `BEGIN`/`ROLLBACK` é o padrão da casa, e **trigger DEFERRED nunca é
avaliado num ROLLBACK**. O mesmo `INSERT` rodado em produção no dia passou — porque a
transação foi desfeita. O defeito é invisível a esse tipo de prova.

É o mesmo formato de cegueira do incidente de 08/09 (`has_role` órfã): lá, chamada dentro
de corpo de função só resolve em runtime; aqui, a guarda só dispara no COMMIT. Nos dois
casos o gate passou e a produção quebrou.

## Correção

`20260910170000_last_admin_guard_ignores_empty_tenant.sql`. Tenant sem NENHUMA pessoa
vinculada não tem invariante a preservar: a guarda existe para ninguém ficar trancado fora
da própria administração, e sem ninguém dentro não há quem trancar. Mesma família da saída
que já existia para tenant inexistente (apagado em cascata).

Provado em Postgres 15 com COMMIT real, sete cenários: o defeito reproduzido com a mensagem
idêntica à de produção; o autocadastro completo passando em transações separadas; e os
QUATRO caminhos que a invariante existe para barrar continuam barrados (remover a capacidade
do último papel, apagar o papel, rebaixar a única pessoa, revogar por exceção individual).
Com dois admins, rebaixar um passa.

**Consequência aceita:** remover a última pessoa de um tenant passa a ser permitido, o que
antes era barrado por efeito colateral. Tenant sem usuário nenhum não está trancado, está
vazio, e nenhuma tela do produto faz isso.

## Regras que saíram disso

1. **Constraint trigger DEFERRED exige prova que comita.** `BEGIN`/`ROLLBACK` não serve —
   usar stub com COMMIT real. Vale para toda guarda `DEFERRABLE INITIALLY DEFERRED`.
2. **Invariante desenhada para uma transação precisa ser conferida contra o caminho real da
   aplicação.** O PostgREST não é transacional entre requisições: o que a Edge Function faz
   em quatro chamadas são quatro transações, e toda guarda no COMMIT avalia estados
   intermediários que o autor nunca imaginou.
3. **Fluxo público entregue sem prova ponta a ponta fica latente até um cliente encontrá-lo.**
   PUL-227 e PUL-253 foram fechadas sem um cadastro real completar uma vez.

Ver PUL-256, e PUL-255 pelo caminho que levou até aqui.
