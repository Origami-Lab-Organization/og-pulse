# FUNC-J9 — Documentos do Funcionário (do zero)
> Jornada: Funcionário J9 · Estado auditado: ❌ NÃO EXISTE (0%)
> Dependências externas: módulo PESSOAS (holerites gerados na folha — Pessoas J6); Func J3 Inbox (✅ pronta) para a notificação

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Nada da jornada. Confirmado: sem rota `/documentos`; tabela `employee_documents` ausente (0 em 254 migrations); bucket `employee-documents` ausente (existe apenas `employee-photos`); sem tipo de notificação `document_available`
- Base reutilizável: Caixa de Entrada (J3) já pronta para receber novos tipos de notificação

**❌ Pendente (tudo):**
- Migration `employee_documents` + bucket `employee-documents` com RLS
- Página `/documentos` com tabs por categoria
- Hook de listagem
- Viewer/Download via URL assinada
- Notificação `document_available`

## História de Usuário

**Como** Consultor,
**quero** acessar `/documentos` e encontrar holerites, contratos e documentos fiscais em um só lugar,
**para que** eu visualize ou baixe qualquer documento pessoal em menos de 30 segundos sem pedir ao RH.

## Contexto

Jornada construída **do zero**. Somente visualização e download — o DP/Admin faz os uploads. Os holerites são gerados automaticamente quando o DP processa a folha (Pessoas J6), então a chegada de holerites depende daquele módulo; as demais categorias (Contratos, Fiscais, Outros) são uploads diretos do DP/Admin. A segurança por RLS (`employee_id` + `tenant_id`) é inegociável: nenhum funcionário pode ver documento de outro.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Migration e bucket**
- Tabela `employee_documents`: `id`, `tenant_id`, `employee_id`, `category`, `title`, `file_url`, `file_size`, `mime_type`, `reference_month`, `uploaded_by`, `uploaded_at`
- Bucket Storage `employee-documents` (privado)
- Migration versionada

**CA-02 — RLS (tenant + dono)**
- Funcionário só lê os próprios documentos (`employee_id` = funcionário logado, dentro do `tenant_id`)
- Acessar `/documentos` ou arquivo de outro funcionário via URL é bloqueado
- Upload restrito a DP/Admin (não ao próprio consultor)

**CA-03 — Página `/documentos` com tabs**
- Tabs por categoria: **Holerites**, **Contratos e Termos**, **Fiscais**, **Outros**
- Estado vazio orientativo por tab quando não há documentos
- Hook de listagem filtrando por `employee_id`/`tenant_id` e categoria

**CA-04 — Holerites (Depende de Pessoas)**
- Cada holerite exibe o mês de referência (`reference_month`) como título principal
- Botões "Visualizar" (PDF inline) e "Baixar"
- **Depende de Pessoas:** os registros de holerite em `employee_documents` (`category = 'holerite'`) são gravados pelo módulo Pessoas (J6) ao processar a folha. Sem o módulo, a tab Holerites apenas exibe estado vazio — a página não quebra

**CA-05 — Visualização e download via URL assinada**
- PDF abre em viewer inline ou nova aba
- Download usa URL assinada do Supabase Storage válida por 10 minutos
- Arquivos `.doc`/`.docx`: apenas download

**CA-06 — URL expirada tratada graciosamente**
- Link de Storage expirado não quebra a página; oferece regenerar/tentar novamente com mensagem clara

### Parte B — Melhorias no existente (depois)

**CA-07 — Notificação de novo documento**
- Ao disponibilizar um documento: notificação na Caixa de Entrada (J3) com `type: 'document_available'` e `action_url` para `/documentos`
- Reaproveita a infra de notificações já existente (não criar mecanismo novo)

## Fora do Escopo

- UI de upload pelo DP/Admin (módulo de gestão de pessoas/admin — coordenar; aqui é só consumo)
- Geração de holerite (Pessoas J6)
- Edição/exclusão de documentos pelo consultor (somente leitura)

## Notas Técnicas

- Criar rota `/documentos` e página correspondente em `src/pages/`
- Criar hook de listagem (`useEmployeeDocuments`) e helper de URL assinada
- Reaproveitar padrão de bucket privado já usado em `employee-photos`
- Notificação: adicionar `document_available` aos tipos do `useInboxNotifications`
- Respeitar `tenant_id`/RLS em tabela e bucket (boundary do projeto)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Consultor abre `/documentos` | Vê tabs e apenas os próprios documentos |
| Acessar documento de outro funcionário via URL | Bloqueado por RLS |
| Holerite do mês (gravado por Pessoas) | Mês como título; "Visualizar" e "Baixar" funcionam |
| Sem módulo Pessoas | Tab Holerites em estado vazio; página não quebra |
| Visualizar PDF | Abre inline/nova aba |
| Baixar arquivo | Download via URL assinada (10 min) |
| URL de Storage expirada | Tratada graciosamente, sem página quebrada |
| Tab sem documentos | Estado vazio orientativo |
| Novo documento disponibilizado | Notificação `document_available` na Inbox com link para `/documentos` |
