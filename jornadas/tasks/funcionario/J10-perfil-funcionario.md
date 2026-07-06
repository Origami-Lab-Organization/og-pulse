# FUNC-J10 — Perfil do Funcionário

> Jornada: Funcionário J10 · Estado auditado: ❌ NÃO EXISTE (~5%)
> Dependências externas: Pessoas J2 (campos de RH no `employees`) — coordenar para não duplicar colunas; nenhuma bloqueante para o MVP do perfil próprio.

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Bucket `employee-photos` existe no Storage (sem upload pelo funcionário).
- Alteração de senha existe parcialmente via `/change-password` (`ChangePassword.tsx`, `updatePassword()` no `AuthContext`, RPC `complete_password_change`).
- `ViaCEP` já é usado no módulo comercial (`src/lib/viaCep.ts` `fetchAddressByCep()`) — reaproveitar, não reimplementar.

**❌ Pendente:**
- Sem rota `/meu-perfil` nem página de perfil próprio.
- Campos de endereço, dados bancários/PIX e `avatar_url` ausentes na `employees`.
- Zero menções a "viacep" em `src/` para o módulo Funcionário (consumo de endereço no perfil ainda não existe).
- Sem upload de avatar pelo funcionário; sem RLS protegendo campos sensíveis (ex.: `salario_mensal`) contra edição pelo próprio funcionário.

## História de Usuário

**Como** Consultor que mudou de telefone, endereço ou conta bancária,
**quero** atualizar meus dados de contato e pagamento direto no sistema,
**para que** eu não dependa do RH e meus reembolsos/correspondências não caiam em dados errados.

## Contexto

J10 é construção do zero, exceto pela alteração de senha (já parcial) e pelo bucket `employee-photos`. A página tem 3 seções: Identidade (somente leitura com cadeado), Contato (editável) e Pagamento (editável), mais Segurança (senha) e foto de perfil. A regra crítica é de boundary: campos sensíveis (`salario_mensal`, CPF, cargo, tipo de contratação) NUNCA podem ser editados pelo funcionário — RLS no banco garante isso mesmo via API direta. PIX e CPF são dados sensíveis: não logar.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Migration de campos no `employees`**
- Adicionar (todos `NULL`): endereço (`cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado`), dados bancários/PIX (`pix_key_type`, `pix_key`, `bank_name`, `bank_agency`, `bank_account`, `bank_account_type`), e `avatar_url`.
- Migration versionada + `tenant_id` respeitado; não duplicar colunas que já venham de Pessoas J2 (verificar antes de criar).

**CA-02 — RLS de campos protegidos**
- Funcionário pode atualizar apenas os campos editáveis do próprio registro (contato, pagamento, `avatar_url`).
- `UPDATE` em `salario_mensal`, CPF, RG, cargo, `tipo_contratacao`, data de admissão pelo próprio funcionário é **rejeitado no banco** (policy), não só ocultado na UI.

**CA-03 — Rota e página `/meu-perfil` com 3 seções**
- Seção 1 — Identidade (somente leitura, ícone de cadeado): nome, CPF, RG, nascimento, email, cargo, tipo de contratação, admissão. Tooltip: "Para alterar, entre em contato com o RH."
- Seção 2 — Contato (editável): telefone (máscara), CEP (ViaCEP), logradouro, número, complemento, bairro, cidade, estado.
- Seção 3 — Pagamento (editável): tipo de chave PIX + valor, banco (lista de bancos BR), agência, conta, tipo de conta.
- Acessível dentro do Meu Espaço; consultor não vê módulos de gestão.

**CA-04 — Edição por seção**
- Cada seção tem botão "Editar" que habilita só os campos daquela seção; "Salvar" persiste apenas aquela seção.
- Salvar campo protegido (mesmo forçado via DevTools) é bloqueado pela RLS (CA-02).

**CA-05 — CEP via ViaCEP**
- Ao preencher CEP válido: logradouro/bairro/cidade/estado autopreenchidos via `fetchAddressByCep()` existente.
- CEP inválido/não encontrado: campos de endereço ficam em branco com mensagem clara (não trava o save manual).

**CA-06 — Upload de avatar**
- Upload JPG/PNG, máximo 2MB, para bucket `employee-photos`; grava `avatar_url`.
- Validação de tipo/tamanho antes do upload; erro claro se exceder.

### Parte B — Melhorias no existente (depois)

**CA-07 — Senha integrada ao perfil**
- Seção "Segurança" com botão "Alterar senha" abrindo dialog (senha atual, nova, confirmação) usando o `updatePassword` existente — sem reimplementar a lógica de `/change-password`.

**CA-08 — Avatar propagado**
- `avatar_url` reflete em navbar, cards de equipe de projeto e listagem do RH (consumir a mesma fonte).

**CA-09 — Validação de PIX/telefone**
- PIX tipo CPF: validar dígito verificador antes de salvar; telefone com máscara; e-mail (read-only) não editável.

## Fora do Escopo

- Crop de imagem do avatar (upload simples basta no MVP).
- Aprovação do DP para alterações (alterações são diretas; visibilidade para o DP é via módulo Pessoas).
- Histórico de alterações de dados bancários (auditoria — avaliar depois).

## Notas Técnicas

- Reusar `src/lib/viaCep.ts`; tabela `employees`; bucket `employee-photos`.
- Boundary: PIX, CPF e dados bancários são sensíveis — nunca logar valores; mascarar em telas de leitura quando aplicável.
- Não duplicar a lógica de troca de senha — chamar `updatePassword` do `AuthContext`.
- RLS é a fonte de verdade da proteção; a UI (cadeado) é apenas reforço de UX.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Atualizar endereço e PIX | Campos persistidos no `employees`; DP vê os dados no módulo RH |
| Editar `salario_mensal` via API direta | RLS rejeita no banco; valor inalterado |
| CEP válido | Endereço autopreenchido via ViaCEP |
| CEP inválido | Campos em branco + mensagem, save manual ainda possível |
| Upload avatar > 2MB ou tipo errado | Bloqueado com erro claro |
| Salvar seção Contato | Só campos de contato alterados; seção Pagamento intacta |
| Alterar senha pelo perfil | Usa `updatePassword` existente; senha trocada |
| PIX CPF com dígito inválido | Validação rejeita antes de salvar |
