# GP-J1 — Cadastro e Gestão de Clientes

> Jornada: GP Comercial J1 · Estado auditado: 🟡 PARCIAL (~50%)
> Dependências externas: nenhuma (não depende de Admin J4 / Tsuru)

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- **F1 — Upload do Cartão CNPJ:** `ClientFormDialog.tsx` invoca `supabase.functions.invoke('parse-cnpj-card')` (Edge Function reutilizada de Fornecedores). Auto-preenche razão social, nome fantasia, CNPJ, endereço, segmento.
- **F2 — CEP inteligente (ViaCEP):** `src/lib/viaCep.ts` (`fetchAddressByCep()`) já integrado no formulário; preenche logradouro, bairro, cidade, estado.
- Service `clientService` e hook `useClients` operam o CRUD básico de empresa/endereço.

**❌ Pendente:**
- **F3 — Campos de contato:** existem em `leads` (migration 20260221012624), **não em `clients`**. Faltam `contact_name`, `contact_email`, `contact_phone`, `segment`, `website`, `notes` na tabela `clients`.
- **F4 — Página de perfil `/clients/:id`:** só existe a lista `/clients` com edição via dialog. Falta página dedicada com histórico de oportunidades e projetos associados.

## História de Usuário

**Como** GP Comercial,
**quero** cadastrar um cliente completo (empresa + contato principal + segmento) em menos de 2 minutos e acessar o perfil dele com o histórico,
**para que** eu chegue numa reunião sabendo com quem falo, sem depender de campos que hoje só existem na oportunidade nem de planilha paralela.

## Contexto

Núcleo da J1. O upload de CNPJ e o ViaCEP já entregam o auto-preenchimento da empresa — a maior parte do "cadastro em 2 minutos" já funciona. O gap real é que o **contato principal mora em `leads`, não em `clients`**, então o GP não encontra "com quem falar" a partir do cliente. Em seguida, falta a página `/clients/:id` que consolida contato + histórico. Esta task entrega primeiro os campos de contato (absorve e expande a GP-J1-CONTACT da QUICK-WINS) e depois a página de perfil.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Campos de contato no banco (F3)**
- Migration versionada adiciona em `clients` (todos `NULL`): `contact_name`, `contact_email`, `contact_phone`, `segment`, `website`, `notes`.
- RLS preservada: novas colunas herdam as políticas de `clients` por `tenant_id` (sem ampliar acesso).

**CA-02 — Formulário de cliente persiste os novos campos (F3)**
- `ClientFormDialog` exibe e grava `contact_name/email/phone`, `segment`, `website`, `notes`.
- `segment` é auto-preenchido pelo retorno de `parse-cnpj-card` (segmento de atuação) quando disponível, permanecendo editável.
- Nenhum campo novo é obrigatório — o cadastro não bloqueia por ausência.

**CA-03 — Validações dos novos campos (F3)**
- `contact_email`: formato de e-mail válido quando preenchido; vazio é aceito.
- `contact_phone`: máscara de telefone; aceita vazio.
- `website`: formato de URL tolerante quando preenchido.

**CA-04 — Página de perfil `/clients/:id` (F4)**
- Nova rota `/clients/:id` (mantém `/clients` como lista) acessível por clique no cliente.
- Seções: dados da empresa + endereço; contatos (campos da CA-01); histórico de oportunidades do cliente; projetos associados.
- Histórico respeita RLS/`tenant_id`: lista apenas oportunidades e projetos do tenant do usuário.

**CA-05 — Estado vazio do histórico (F4)**
- Cliente sem oportunidades/projetos: estado vazio orientativo em cada seção, sem erro.

### Parte B — Melhorias no existente (depois)

**CA-06 — Acesso ao perfil a partir da lista e da oportunidade**
- Card/linha do cliente na lista `/clients` linka para `/clients/:id`.
- A oportunidade (módulo Comercial) linka para o perfil do cliente associado.

**CA-07 — Cenários-limite documentados**
- CNPJ inválido no upload: mensagem clara, formulário não trava (preservar comportamento atual).
- CEP não encontrado: campos permanecem editáveis (preservar comportamento atual).
- Excluir cliente com oportunidades ativas: ao menos alertar (não excluir silenciosamente).

## Fora do Escopo

- Suporte a múltiplos contatos por cliente (cenário-limite — avaliar depois).
- Edição inline de oportunidades a partir do perfil do cliente.
- Visão por empresa do pipeline agrupado por etapa (isso é GP-J3 F4, consome esta página).

## Notas Técnicas

- Tabela `clients`; form `src/components/clients/ClientFormDialog.tsx`; service `src/services/clientService.ts`; hook `useClients`.
- ViaCEP (`src/lib/viaCep.ts`) e `parse-cnpj-card` já integrados — **não reimplementar**; apenas mapear `segment` do retorno do parser.
- `parse-cnpj-card` é a mesma Edge Function de Fornecedores; reaproveitar payload existente.
- Página `/clients/:id` reutiliza o mesmo carregamento de oportunidades/projetos já existente, filtrado por `client_id`.
- Respeitar `tenant_id`/RLS em todas as leituras do histórico.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Salvar cliente com contato + segmento | Campos persistidos em `clients` |
| Upload de Cartão CNPJ | `segment` (e demais dados de empresa) auto-preenchido quando o parser retorna |
| E-mail de contato inválido | Validação inline, não salva |
| Campos de contato vazios | Cliente salvo normalmente |
| Abrir `/clients/:id` | Perfil com empresa, contatos, oportunidades e projetos do cliente |
| Cliente sem oportunidades/projetos | Estado vazio orientativo em cada seção |
| Cliente de outro tenant | Não acessível (RLS bloqueia) |
| Excluir cliente com oportunidades ativas | Alerta/bloqueio antes da exclusão |
