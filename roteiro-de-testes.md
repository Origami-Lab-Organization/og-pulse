# Roteiro de Testes — GP-J1 (Cadastro e Gestão de Clientes)

> Teste manual de tudo que foi desenvolvido nesta entrega.
> Marque `[x]` conforme for validando. Perfil necessário: **usuário gerente** (`is_gerente`).

## Pré-requisitos

- [x] **Aplicar a migration** `supabase/migrations/20260619160000_clients_contact_fields.sql`
  - Local: `supabase db reset` (ou `supabase migration up`) — atenção: `db reset` recria o banco.
  - Conferir no banco que a tabela `clients` tem as 6 colunas novas, todas aceitando `NULL`:
    `contact_name`, `contact_email`, `contact_phone`, `segment`, `website`, `notes`.
- [x] Edge Function `parse-cnpj-card` atualizada/deployada no ambiente que você for testar
      (necessária para o teste de auto-preenchimento do segmento).
- [x] Subir o app: `npm run dev` e logar com um usuário **gerente**.
- [x] Ter à mão **1 PDF de Cartão CNPJ** válido para o teste de upload.

---

## Parte A — Campos de contato

### CA-02 / CA-03 — Cadastro com contato, segmento, website e notas

1. [ ] Ir em **Clientes** → **Adicionar Cliente**.
2. [ ] Preencher **Razão Social** (obrigatório) e a nova seção **Contato**:
   - Nome do contato, E-mail (válido), Telefone, Website, Observações.
   - Preencher **Segmento** (campo junto aos dados da empresa).
3. [ ] Salvar.
   - **Esperado:** cliente salvo sem erro; toast de sucesso.
4. [ ] Reabrir o cliente (clicar na linha → perfil → **Editar**, ou pela lista).
   - **Esperado:** todos os campos de contato/segmento/website/notas preenchidos como salvos.
   - **Esperado:** telefone exibido com máscara `(00) 00000-0000`.

### CA-02 — Auto-preenchimento por Cartão CNPJ (incluindo segmento)

5. [ ] Em **Adicionar Cliente**, usar **Enviar Cartão CNPJ (PDF)**.
   - **Esperado:** razão social, nome fantasia, CNPJ e endereço preenchidos automaticamente.
   - **Esperado:** **Segmento** preenchido automaticamente (quando o parser identifica a atividade/CNAE).
6. [ ] Editar manualmente o **Segmento** após o auto-preenchimento.
   - **Esperado:** campo permanece editável; valor manual é mantido ao salvar.

### CA-03 — Validações

7. [ ] Preencher **E-mail de contato** inválido (ex.: `abc@`) e tentar salvar.
   - **Esperado:** erro inline "E-mail inválido"; **não salva**.
8. [ ] Preencher **Website** inválido (ex.: `:://nada`) e tentar salvar.
   - **Esperado:** erro inline "URL inválida"; não salva. (`site.com` e `https://site.com` são aceitos.)
9. [ ] Deixar **todos os campos de contato vazios** e salvar (só Razão Social).
   - **Esperado:** cliente salvo normalmente — nenhum campo novo é obrigatório.

---

## Parte B — Perfil `/clients/:id` e melhorias

### CA-04 — Página de perfil

10. [ ] Na lista **Clientes**, **clicar na linha** de um cliente.
    - **Esperado:** abre a página de perfil em `/clients/:id` (não o dialog de edição).
11. [ ] Conferir as seções no perfil:
    - **Empresa:** logo/iniciais, razão social, nome fantasia, CNPJ, segmento, endereço.
    - **Contato:** nome, e-mail, telefone (com máscara), website, observações.
    - **Oportunidades:** lista de oportunidades do cliente (nome, etapa, valor).
    - **Projetos:** lista de projetos do cliente (nome, período, status).
12. [ ] Clicar em um **projeto** da lista.
    - **Esperado:** navega para `/projects/:id` daquele projeto.
13. [ ] No perfil, clicar em **Editar** → alterar um campo → salvar.
    - **Esperado:** dados atualizam no perfil sem recarregar a página.

### CA-05 — Estado vazio do histórico

14. [ ] Abrir o perfil de um cliente **sem oportunidades e sem projetos**.
    - **Esperado:** cada seção mostra mensagem orientativa ("Nenhuma oportunidade vinculada…",
      "Nenhum projeto associado…"), **sem erro** e sem quebra de layout.

### CA-06 — Acesso ao perfil a partir da lista e da oportunidade

15. [ ] (Já coberto no item 10) Linha da lista → perfil.
16. [ ] No módulo **Pipeline/Comercial**, abrir uma **oportunidade vinculada a um cliente existente**
        → aba **Contato**.
    - **Esperado:** aparece o link **"Ver perfil do cliente"** abaixo do campo Empresa.
17. [ ] Clicar em **"Ver perfil do cliente"**.
    - **Esperado:** fecha o painel da oportunidade e abre `/clients/:id` do cliente associado.
18. [ ] Abrir uma oportunidade **sem cliente vinculado** (empresa avulsa).
    - **Esperado:** o link "Ver perfil do cliente" **não** aparece.

### CA-07 — Cenários-limite

19. [ ] **Excluir cliente COM oportunidades/projetos**: abrir o diálogo de exclusão
        (menu de ações na lista, ou botão **Excluir** no perfil) de um cliente que tenha vínculos.
    - **Esperado:** aviso em destaque informando a quantidade
      (ex.: "Este cliente tem 2 oportunidades e 1 projeto vinculado…").
    - **Esperado:** ainda é possível **Confirmar** a exclusão (avisa, não bloqueia).
20. [ ] **Excluir cliente SEM vínculos**.
    - **Esperado:** diálogo padrão, **sem** o bloco de aviso.
21. [ ] **Upload de Cartão CNPJ inválido** (PDF que não é cartão / corrompido).
    - **Esperado:** mensagem de erro clara via toast; o formulário **não trava** e segue editável.
22. [ ] **CEP não encontrado** (digitar um CEP inexistente no formulário).
    - **Esperado:** campos de endereço permanecem editáveis; sem travar.

---

## Segurança / Multi-tenant

23. [ ] Tentar acessar `/clients/:id` de um cliente de **outro tenant** (cole um id que não é seu).
    - **Esperado:** "Cliente não encontrado" (RLS bloqueia a leitura) — sem vazar dados.
24. [ ] Confirmar que **Oportunidades** e **Projetos** no perfil mostram **apenas** itens do
        seu tenant.

---

## Regressão rápida (não quebrou o que já existia)

25. [ ] Lista de clientes carrega, busca por nome/fantasia/CNPJ funciona.
26. [ ] Criar cliente só com endereço via CEP (ViaCEP) continua preenchendo logradouro/bairro/cidade/UF.
27. [ ] Upload de logo do cliente continua funcionando.
28. [ ] Editar e excluir cliente a partir do menu de ações da lista continuam funcionando.

---

### Verificações técnicas já realizadas

- `npm run build` ✅ (apenas warnings pré-existentes de chunk size / dynamic import).
- ESLint nos arquivos novos/alterados: limpo.
- **Pendente de validar por você:** aplicação da migration no banco (item de pré-requisito).
