# GP-J9 — Anexo de Contrato no Fechamento

> Jornada: GP Comercial J9 · Estado auditado: ❌ NÃO EXISTE (~5%)
> Dependências externas: bucket de Storage para contratos (criar se não existir). **Interna:** depende de **GP-J8** — este é o step opcional pós-celebração do fechamento; também consumido pela aba Arquivos do projeto (GP Projetos J12).

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Campo `projects.contract_url` existe no banco (`src/types/project.ts`) — **sem nenhuma UI** que o leia ou grave.

**❌ Pendente (UI do zero):**
- Step de upload pós-fechamento (PDF, máx. 10MB, com opção "Pular por enquanto").
- Gravação em `projects.contract_url`.
- Registro em `project_files` com `category: 'contract'` (para aparecer na aba Arquivos do projeto).
- Acesso posterior ao contrato quando o GP pulou no fechamento.

## História de Usuário

**Como** GP Comercial que acabou de fechar um negócio,
**quero** anexar o contrato assinado imediatamente (ou pular sem fricção),
**para que** o fechamento fique documentado e o contrato acessível a toda a equipe do projeto, sem trocar de ferramenta.

## Contexto

Jornada J9 F1/F2. Impacto baixo (⭐⭐), mas fecha o ciclo do fechamento. **É um step do fluxo de GP-J8** — só aparece após a celebração (J8 Seção 3). O `contract_url` já existe no schema; falta toda a camada de UI/storage. O step deve ser claramente opcional: "Pular" com o mesmo destaque visual do botão de upload.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-A1 — Step opcional pós-celebração**
- Após a celebração de GP-J8, o dialog exibe o passo: *"Deseja anexar o contrato agora?"*
- Botão "Fazer upload" → file picker (aceita apenas PDF, máximo 10MB).
- Botão "Pular por enquanto" → encerra o fluxo normalmente, com o mesmo peso visual do botão de upload.

**CA-A2 — Validação do arquivo (antes do upload)**
- Arquivo > 10MB: mensagem de erro **antes** de iniciar o upload; não envia.
- Tipo diferente de PDF: rejeitado com mensagem clara.
- PDF corrompido / falha de upload: erro tratado graciosamente; o GP pode tentar de novo ou pular.

**CA-A3 — Persistência ao fazer upload**
- Arquivo enviado ao bucket de Storage de contratos (path com `tenant_id`/`project_id`).
- `projects.contract_url` atualizado.
- Registro criado em `project_files` com `category: 'contract'` (para a aba Arquivos — GP Projetos J12).
- As três gravações são consistentes: se a gravação de metadados falhar após o upload, não deixar `contract_url` apontando para arquivo órfão sem registro (tratar erro / reverter referência).

**CA-A4 — Pular não cria nada**
- "Pular por enquanto": fluxo encerra sem tocar em `contract_url` nem `project_files`.

### Parte B — Melhorias no existente (depois)

**CA-B1 — Acesso posterior**
- Se o GP pulou no fechamento, é possível adicionar o contrato depois pela aba Arquivos do projeto e/ou pelo perfil da oportunidade — reutilizando o mesmo componente/serviço de upload (CA-A3).

**CA-B2 — Desfazer "Pular" acidental**
- Pular acidentalmente não deve exigir refazer o fechamento; o caminho de CA-B1 cobre isso (documentar o caminho ao usuário).

## Fora do Escopo

- Celebração e "Distribuir igualmente" (GP-J8).
- Versionamento de contrato / múltiplos contratos por projeto (cenário-limite — avaliar depois).
- Assinatura eletrônica / integração com DocuSign e similares.
- Visualizador PDF embutido (link de download basta).

## Notas Técnicas

- Ponto de entrada: o estado "celebrated"/callback exposto por `CloseBusinessDialog.tsx` em GP-J8 (`Notas Técnicas` daquela task). Montar este step como continuação, sem fechar o dialog antes da decisão.
- Storage: usar/criar bucket dedicado a contratos com RLS por `tenant_id` (espelhar o padrão de buckets já existentes, ex: recibos de reembolso `reimbursement_requests`). URL de acesso via URL assinada, não pública.
- `project_files`: inserir com `category: 'contract'`, `project_id`, `tenant_id` e referência ao arquivo no bucket.
- Multi-tenant/RLS obrigatórios em Storage e em `project_files`; o GP só anexa em projeto do próprio tenant/membership.
- Limite de 10MB validado no cliente (antes do envio) e idealmente também pela policy do bucket.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Upload de PDF válido (< 10MB) | `contract_url` atualizado + registro em `project_files` (`category: 'contract'`) |
| Arquivo > 10MB | Erro antes do upload; nada enviado |
| Arquivo não-PDF | Rejeitado com mensagem clara |
| Falha de upload / PDF corrompido | Erro gracioso; sem `contract_url` órfão; permite tentar de novo ou pular |
| "Pular por enquanto" | Fluxo encerra; `contract_url` e `project_files` inalterados |
| Anexar depois pela aba Arquivos | Mesmo resultado de CA-A3 sem refazer o fechamento |
| Contrato anexado por outro tenant | Bloqueado por RLS |
