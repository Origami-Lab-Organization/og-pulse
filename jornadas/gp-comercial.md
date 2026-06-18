# Hackathon Origami Pulse
## Jornadas da Persona — GP Comercial
### Guia Completo para as Equipes

---

**Data:** 04 de junho de 2026 · Origami Lab · Formiga MG  
**Persona:** Cecilia (Titila) — GP no módulo Comercial  
**Equipe responsável:** 🐟 Koi (GP Comercial + GP Projetos, 3 pessoas)  
**Total de jornadas:** 9

---

## Quem é o GP Comercial

O GP Comercial é responsável por todo o pipeline da Origami Lab — da primeira conversa com um potencial cliente até o negócio fechado e o projeto criado. Em consultorias de pequeno porte, é comum a mesma pessoa fechar e depois executar o projeto.

**O que tira o GP Comercial do sono:**
- Esquecer de fazer follow-up e perder uma oportunidade que estava quente
- Criar um orçamento com margem negativa sem perceber
- Fechar um negócio e descobrir que as informações não passaram corretamente para o projeto
- Não saber em qual etapa o pipeline está travando mais

---

## ⚠️ ATENÇÃO — J3 depende da migration do Admin

**J3 (Pipeline) só pode ser iniciada após a equipe Tsuru confirmar que a migration do Catálogo de Serviços (Admin J4) foi executada com sucesso.** J3 usa `service_lines` e `service_revenue_models` criados pela migration.

---

## Nomenclatura Atualizada (J2)

| Termo Antigo | Termo Novo |
|---|---|
| CRM | Orçamentos |
| Lead | Oportunidade |
| Funil | Pipeline |
| /crm | /orcamentos |
| "Novo Lead" | "Nova Oportunidade" |

**Zero ocorrências da nomenclatura antiga devem permanecer na interface após J2.**

---

---

# JORNADA J1
## Cadastro e Gestão de Clientes

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

A entidade cliente existe mas está incompleta: faltam campos de contato (nome, email, telefone do contato principal), upload de Cartão CNPJ para auto-preenchimento, e CEP inteligente com preenchimento via ViaCEP. O GP precisa de muito mais cliques e digitação do que o necessário.

### Objetivo

GP cadastra cliente completo em menos de 2 minutos, preferencialmente via upload do Cartão CNPJ que auto-preenche os dados.

### Estado Atual

Entidade `client` existe com campos básicos. Sem upload de CNPJ, sem CEP inteligente, sem campos de contato, sem página dedicada de perfil do cliente.

---

### Jobs to be Done

**Funcionais:**
- Cadastrar um novo cliente completo em menos de 2 minutos via CNPJ
- Encontrar os dados de contato de um cliente sem sair do sistema
- Manter o cadastro de clientes atualizado sem trabalho manual

**Emocionais:**
- Chegar numa reunião com o cliente sabendo exatamente com quem está falando
- Não sentir vergonha de pedir o CNPJ de novo por não ter registrado da primeira vez

**Social:**
- Transmitir profissionalismo ao cliente mostrando que seus dados estão organizados

---

### Fluxos

**F1 — Upload do Cartão CNPJ**  
Reutilizar Edge Function `parse-cnpj-card` que já existe para Fornecedores. Auto-preenche: razão social, nome fantasia, CNPJ, endereço completo, segmento de atuação.

**F2 — CEP Inteligente**  
Campo CEP com consulta automática ViaCEP ao completar 8 dígitos. Auto-preenche logradouro, bairro, cidade, estado. Já existe em Fornecedores — reutilizar.

**F3 — Campos de Contato**  
Adicionar na tabela `clients`: `contact_name`, `contact_email`, `contact_phone`, `segment`, `notes`, `website`. Exibir na página de perfil do cliente.

**F4 — Página de Perfil do Cliente (`/clients/:id`)**  
Migrar de dialog para página dedicada com: dados da empresa, contatos, histórico de oportunidades, projetos associados.

---

### Cenários-Limite

- CNPJ inválido no upload — mensagem de erro clara sem travar o formulário?
- CEP não encontrado no ViaCEP — campos permanecem editáveis?
- Cliente com múltiplos contatos — estrutura suporta mais de um contato?
- Excluir cliente com oportunidades ativas — bloquear ou apenas alertar?

---

### Critério de Sucesso

GP cadastra cliente completo em menos de 2 minutos via CNPJ upload. Todos os dados básicos auto-preenchidos. Página de perfil acessível com histórico de oportunidades. Equipe documenta 2 melhorias de UX encontradas.

---

---

# JORNADA J2
## Gestão de Oportunidades (Renomeação CRM)

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

O módulo existe como "CRM" com "leads". Toda a nomenclatura está errada para uma consultoria — o GP não se identifica com terminologia de vendas B2C. O campo `service_line` está hardcoded como string em vez de referenciar o catálogo do admin. Criar um cliente inline (sem sair do formulário de oportunidade) não existe.

### Objetivo

GP cria oportunidades de forma rápida com a nomenclatura correta. Zero ocorrências de "Lead", "CRM" ou "Funil" na interface. `service_line` referencia o catálogo do admin.

### Estado Atual

Módulo CRM implementado com leads e pipeline Kanban. Terminologia incorreta em todo lugar. `service_line` hardcoded como string.

---

### Jobs to be Done

**Funcionais:**
- Criar uma oportunidade rapidamente enquanto estou numa call com o prospect
- Nunca perder o registro de uma conversa comercial por falta de onde anotar
- Ter todas as oportunidades em um lugar sem planilha paralela

**Emocionais:**
- Sentir que nenhuma oportunidade vai cair no esquecimento
- Ter clareza sobre o pipeline sem montar relatório manualmente

**Social:**
- Mostrar para o sócio/admin que o pipeline comercial está sendo gerenciado ativamente

---

### Fluxos

**F1 — Renomeação Completa**  
Substituir em todos os arquivos:
- "CRM" → "Orçamentos" ou "Comercial"
- "Lead" → "Oportunidade" (singular/plural)
- "Funil" → "Pipeline"
- Rota `/crm` → `/orcamentos`
- "Novo Lead" → "Nova Oportunidade"

Verificar: buscar por "lead", "crm", "funil" (case-insensitive) em todo o código e substituir onde aparece na UI.

**F2 — `service_line_id` referenciando catálogo**  
Campo `service_line_id` em `opportunities` referencia `service_lines.id` (criado em Admin J4). Seletor no formulário usa o catálogo do admin. Depende da migration do Admin J4.

**F3 — Criar Cliente Inline**  
Dentro do formulário de nova oportunidade, se o cliente não existe, botão "+ Criar cliente" abre um mini-formulário inline sem perder os dados já preenchidos na oportunidade. Ao salvar o cliente, o campo de cliente da oportunidade é preenchido automaticamente.

**F4 — Exclusão Protegida**  
Excluir oportunidade: apenas admin. GP pode arquivar (J7) mas não excluir permanentemente.

---

### Cenários-Limite

- Criação de cliente inline falha — oportunidade mantém os dados digitados?
- `service_line` sem nenhuma linha cadastrada (admin não configurou J4) — dropdown mostra estado vazio orientativo?
- Oportunidade sem cliente — permitido ou obrigatório?

---

### Critério de Sucesso

GP cria oportunidade em menos de 60 segundos com criação de cliente inline. Zero ocorrências de "Lead", "CRM" ou "Funil" na interface ao buscar por esses termos.

---

---

# JORNADA J3
## Pipeline com Progressão por Etapa

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5  
**⚠️ Depende de Admin J4 (migration). Só iniciar após confirmação da equipe Tsuru.**

---

### Contexto e Problema

O pipeline não tem progressão por etapa — GP pode mover qualquer card para qualquer coluna sem preencher nada. Resultado: cards chegam em "Negociação" sem orçamento vinculado, sem Linha de Serviço definida. A qualidade das informações no pipeline é inconsistente.

### Objetivo

GP avança oportunidades com definições progressivas obrigatórias por etapa. Card comunica o estado completo em menos de 3 segundos de leitura.

### Estado Atual

Kanban de oportunidades existe com colunas e drag-and-drop. Sem validação de progressão. Cards básicos.

---

### Jobs to be Done

**Funcionais:**
- Avançar uma oportunidade entre etapas com as definições obrigatórias preenchidas
- Saber imediatamente quais oportunidades estão travadas e por quê
- Ver o pipeline completo de uma empresa em menos de 30 segundos

**Emocionais:**
- Sentir que o processo comercial está sob controle mesmo com múltiplas oportunidades
- Não perder negócios por deixar oportunidades sem follow-up por tempo demais

**Social:**
- Ter um processo comercial estruturado que justifica o crescimento da empresa

---

### Fluxos

**F1 — Progressão por Etapa com Pré-requisitos**

| Transição | Obrigatório para avançar |
|---|---|
| Triagem → Qualificação | (livre — sem pré-requisito) |
| Qualificação → Proposta | Linha de Serviço e Serviço definidos |
| Proposta → Negociação | Orçamento vinculado à oportunidade |
| Negociação → Fechado/Perdido | Decisão de fechamento ou motivo de perda |

Ao tentar mover sem preencher o pré-requisito: modal com os campos faltantes. GP preenche e confirma sem precisar voltar ao card.

**F2 — Card do Kanban Redesenhado**  
O card deve comunicar em 3 segundos:
- Nome da oportunidade + cliente
- Linha de Serviço e Serviço
- Modelo de receita e valor estimado
- Pré-condição pendente (em destaque vermelho)
- Próximo follow-up (verde se futuro, vermelho se vencido)
- Sinalização de parado (badge amarelo após X dias sem movimento)

**F3 — Alertas de Parado por Etapa**  
Configurar os limites de inatividade por etapa:
- Qualificação: 14 dias sem comentário → badge "Parado"
- Proposta: 7 dias → badge "Parado"
- Negociação: 3 dias → badge "Atenção"

O badge "Parado" não bloqueia — apenas sinaliza visualmente no card.

**F4 — Visão por Empresa**  
Ao abrir o perfil de um cliente, ver todas as oportunidades agrupadas por etapa com status visual.

---

### Cenários-Limite

- GP arrasta card diretamente da Triagem para Negociação — sistema pede preenchimento em cadeia?
- Oportunidade em Proposta sem orçamento criado ainda — campo obrigatório só ao mover para Negociação?
- Pipeline com 30+ cards em uma coluna — scroll vertical, sem perda de performance?

---

### Critério de Sucesso

GP avança oportunidade de Triagem até Proposta preenchendo pré-requisitos em cada etapa. Card lido em menos de 3 segundos. Badge de parado aparece após o número de dias configurado. Equipe documenta 3 situações onde o pré-requisito seria inconveniente — viram discussão de produto.

---

---

# JORNADA J4
## Orçamentação por Modelo de Receita

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

O wizard de orçamentação atual suporta 4 billing types básicos. Com os novos Modelos de Receita do catálogo do admin (J4), precisa evoluir para suportar 6 modelos base + combinações. A validação de margem em tempo real precisa estar integrada com os limites definidos pelo admin.

### Objetivo

GP cria orçamentos precisos para qualquer modelo de receita em menos de 10 minutos, com validação automática de margem e wizard adaptado ao tipo selecionado.

### Estado Atual

Wizard de orçamentação existe com 4 modelos básicos. Não suporta indicação, equity ou combinações. Validação de margem existe mas pode estar incompleta.

---

### Jobs to be Done

**Funcionais:**
- Criar um orçamento preciso para qualquer modelo de receita em menos de 10 minutos
- Saber em tempo real se o orçamento está dentro da margem mínima do admin
- Ajustar o orçamento e ver o impacto na margem antes de enviar ao cliente

**Emocionais:**
- Ter confiança ao apresentar o preço sabendo que a margem está protegida
- Não precisar pedir aprovação do admin para orçamentos dentro da margem esperada

**Social:**
- Apresentar propostas consistentes e profissionais independente de quem criou o orçamento

---

### Fluxos

**F1 — Modelos Alta Prioridade (Sprint 3)**

**Contrato (escopo fixo):**
Campos: valor total, número de parcelas, dia de vencimento, primeira data de emissão. Sistema calcula cronograma de parcelas automaticamente.

**Preço Fixo (baseado no catálogo):**
GP seleciona Serviço com `base_value` definido. Valor pré-preenchido mas editável.

**Recorrência (mensalidade):**
Campos: valor mensal, dia de cobrança, número de meses ou contrato indeterminado.

**Taxa de Sucesso:**
Campos: % sobre resultado, critério de medição, período de apuração, valor mínimo garantido (opcional).

**F2 — Modelos Média Prioridade (Sprint 4)**

**Indicação:**
Campos: % de comissão sobre indicação, critério de pagamento (quando o indicado fechar, quando pagar X meses, etc).

**Equity:**
Campos: % de participação societária, cronograma de vesting, cláusulas especiais.

**Combinações (Recorrência + Taxa de Sucesso):**
GP seleciona múltiplos modelos para a mesma oportunidade. Sistema soma os componentes.

**F3 — Validação de Margem em Tempo Real**  
Ao montar o orçamento, painel lateral mostra:
- Receita bruta
- Custos de labor (baseado nos encargos do admin)
- Outros custos estimados
- **Margem bruta %** (em verde se acima do mínimo, em vermelho se abaixo)

Se margem abaixo do mínimo ao tentar salvar: opções são (1) ajustar o valor ou (2) enviar para aprovação do admin.

---

### Cenários-Limite

- Admin não definiu margem mínima (campo zerado) — sistema aceita qualquer margem sem alertar?
- GP tenta salvar orçamento com margem negativa — bloqueia ou solicita aprovação?
- Orçamento de combinação de modelos com componentes conflitantes — validação clara?
- Rascunho de orçamento salvo sem todos os campos — marcado como "rascunho" visualmente?

---

### Critério de Sucesso

Mínimo 4 modelos funcionando end-to-end. Pelo menos 1 orçamento com violação de margem percorrendo o fluxo de aprovação do admin. GP não consegue finalizar orçamento com margem abaixo do mínimo sem aprovação. Equipe documenta qual modelo foi mais difícil de implementar.

---

---

# JORNADA J5
## Comentários e Alertas de Follow-up

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐⭐ 4/5

---

### Contexto e Problema

A infraestrutura de comentários existe (`leadActivityService` + polling de 60s) mas a experiência visual provavelmente está incompleta. Não há distinção clara entre atividades automáticas do sistema (ex: "oportunidade avançou para Proposta") e comentários manuais do GP. Follow-ups não têm responsável ou data visíveis no card.

### Objetivo

GP abre oportunidade e em 10 segundos entende: quando foi o último contato, o que foi discutido e qual é o próximo passo.

### Estado Atual

`leadActivityService` implementado. `lead_follow_ups` existe. Polling de 60s para updates. Distinção visual entre tipos de atividade provavelmente incompleta.

---

### Jobs to be Done

**Funcionais:**
- Registrar o histórico de uma negociação sem sair do sistema
- Ser alertado quando uma oportunidade está parada há mais tempo que o normal
- Saber o que foi discutido numa conversa de semanas atrás sem precisar perguntar

**Emocionais:**
- Sentir que não vai esquecer nenhum compromisso que assumiu com o prospect
- Não sentir ansiedade por não saber o status atual de cada oportunidade

**Social:**
- Demonstrar ao prospect que cada conversa foi registrada e levada a sério

---

### Fluxos

**F1 — Timeline com 3 tipos de entrada**

| Tipo | Origem | Visual |
|---|---|---|
| Atividade automática | Sistema (mudança de etapa, criação de orçamento) | Ícone cinza, texto compacto |
| Comentário manual | GP digita livremente + upload de arquivo | Avatar colorido, texto completo |
| Follow-up | Tarefa futura com data e responsável | Ícone de calendário, badge de status |

**F2 — Criar Follow-up**  
Ao clicar em "Agendar follow-up": data, horário (opcional), responsável, descrição. Aparece na timeline como tarefa futura. No dia agendado: notificação para o responsável. Após a data: aparece como vencido se não foi marcado como concluído.

**F3 — Follow-up Vencido no Card do Pipeline**  
Se o próximo follow-up está vencido, o card do Kanban exibe um indicador visual em vermelho. GP vê no pipeline quais oportunidades têm compromissos atrasados sem precisar abrir cada uma.

**F4 — Upload de Anexos em Comentários**  
GP pode anexar PDFs ou imagens a um comentário (ex: proposta enviada, print de email). Exibido como link de download na timeline.

---

### Cenários-Limite

- Comentário com 2000+ caracteres — interface não quebra?
- Dois GPs comentando na mesma oportunidade ao mesmo tempo — sem conflito?
- Polling de 60s enquanto usuário está digitando — não interrompe a digitação?

---

### Critério de Sucesso

GP abre uma oportunidade e lê o histórico em 10 segundos. Card do pipeline exibe próximo follow-up com sinalização de vencido. Tipos de atividade visualmente distintos. Equipe documenta se o polling de 60s é suficiente ou se Realtime seria melhor.

---

---

# JORNADA J7
## Arquivamento e Exclusão de Oportunidades

**Impacto Origami Lab:** ⭐⭐⭐ 3/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

Arquivamento existe mas provavelmente sem motivo obrigatório e sem campo de concorrente. Exclusão definitiva sem proteção adequada — qualquer GP pode excluir permanentemente uma oportunidade. O histórico de perdas é valioso e está sendo perdido.

### Objetivo

GP arquiva oportunidade perdida com motivo e concorrente em menos de 30 segundos. Exclusão definitiva invisível para qualquer GP. Restauração de oportunidade arquivada funciona.

### Estado Atual

Arquivamento implementado de forma básica. Sem motivo obrigatório. Sem campo de concorrente. Sem proteção de exclusão.

---

### Jobs to be Done

**Funcionais:**
- Arquivar uma oportunidade perdida com o motivo sem perder o histórico
- Registrar qual concorrente ganhou para entender padrões de perda
- Restaurar uma oportunidade arquivada quando o cliente retoma o contato

**Emocionais:**
- Sentir que perder uma oportunidade gera aprendizado, não só frustração
- Manter o pipeline limpo sem apagar o histórico da empresa

**Social:**
- Ter dados de win/loss para apresentar em reuniões de estratégia comercial

---

### Fluxos

**F1 — Motivo de Perda Obrigatório**  
Sem selecionar motivo: botão "Confirmar arquivo" desabilitado. Motivos disponíveis:
- Concorrência
- Orçamento acima do esperado
- Prazo incompatível
- Decisão adiada
- Projeto interno cancelado
- Sem retorno
- Outro (campo livre)

**F2 — Campo Concorrente**  
Visível apenas quando motivo = "Concorrência". GP digita o nome do concorrente. Alimenta métricas de J11 (Analytics Comercial).

**F3 — Restauração**  
GP escolhe a etapa para onde a oportunidade retorna (não assume etapa anterior automaticamente). Restaurada oportunidade aparece no pipeline com badge "Reativada" por 48h.

**F4 — Exclusão Definitiva (admin only)**  
Botão de exclusão permanente invisível para GPs. Admin vê o botão com confirmação extra: digitar o nome da oportunidade antes de confirmar.

---

### Cenários-Limite

- Oportunidade arquivada com follow-ups futuros pendentes — follow-ups são cancelados automaticamente?
- Restaurar oportunidade com cliente que foi excluído entre o arquivo e a restauração — erro tratado graciosamente?
- Arquivar oportunidade com orçamento aprovado — alerta especial?

---

### Critério de Sucesso

GP arquiva com motivo e concorrente em menos de 30 segundos. Botão de exclusão definitiva invisível para GP. Restauração funciona com seleção de etapa. Equipe documenta quantas oportunidades arquivadas existem no banco e se os dados de motivo estão sendo salvos corretamente.

---

---

# JORNADA J8
## Negócio Fechado

**Impacto Origami Lab:** ⭐⭐⭐⭐⭐ 5/5  
**Impacto na Persona:** ⭐⭐⭐⭐⭐ 5/5

---

### Contexto e Problema

O `useCloseBusinessDeal` existe e cria o projeto. O desafio é a experiência: o dialog atual é básico, sem visualização das parcelas antes de confirmar, sem adaptação por modelo de receita e sem o momento de celebração que um fechamento merece.

### Objetivo

GP fecha negócio em fluxo guiado com 3 seções, visualiza o cronograma financeiro antes de confirmar e experimenta um momento de celebração memorável. Projeto criado automaticamente no portfólio.

### Estado Atual

`useCloseBusinessDeal` implementado. Dialog básico sem wizardação. Sem animação. Sem adaptação por modelo. Sem visualização de parcelas.

---

### Jobs to be Done

**Funcionais:**
- Formalizar o fechamento de um negócio em menos de 5 minutos
- Definir o cronograma de parcelas e ter o projeto criado automaticamente
- Garantir que todas as condições do negócio estão registradas antes de começar o projeto

**Emocionais:**
- Sentir que fechar um negócio é um momento de celebração, não de burocracia
- Ter a segurança de que o projeto vai começar com todas as informações corretas

**Social:**
- Celebrar o fechamento com a equipe de forma memorável e visível no sistema

---

### Fluxos

**F1 — Seção 1: Definição do Projeto**  
- Nome do projeto (pré-preenchido da oportunidade, editável)
- GP responsável (obrigatório — pode ser diferente do GP comercial)
- Data de início e data prevista de término
- Descrição/escopo resumido

**F2 — Seção 2: Condições Financeiras (adapta ao modelo)**  

*Contrato (escopo fixo):*
- Tabela de parcelas editável: data de emissão, data de vencimento, valor
- Botão "Distribuir igualmente" auto-divide pelo número de parcelas

*Recorrência (mensalidade):*
- Data da primeira cobrança, valor mensal, duração (meses ou indeterminado)
- Visualização dos próximos 3 meses de cobrança

*Taxa de Sucesso:*
- Data prevista de apuração, % sobre resultado, valor base estimado

**F3 — Seção 3: Revisão + Celebração**  
- Resumo completo do projeto: cliente, GP, datas, cronograma financeiro
- Valor total do contrato em destaque
- Botão "Confirmar e celebrar!"
- Ao confirmar: animação de confetti ou celebração visual, mensagem "🎉 [Nome do Cliente] fechado! R$ [valor]"
- Card do projeto criado automaticamente no Portfólio na etapa "Planejamento"

---

### Cenários-Limite

- GP fecha negócio com modelo Equity (sem parcelas) — seção financeira adapta sem exibir cronograma?
- `useCloseBusinessDeal` falha (erro de banco) — dados do formulário preservados, mensagem de erro clara?
- Projeto criado mas GP responsável não tem conta no sistema ainda — oportunidade de criar usuário inline?

---

### Critério de Sucesso

GP fecha Contrato de 6 parcelas em menos de 5 minutos. Tabela de parcelas exibida antes da confirmação. Animação de celebração aparece. Projeto aparece no portfólio com estágio "Planejamento". Equipe documenta qual detalhe da animação causou mais engajamento durante o teste.

---

---

# JORNADA J9
## Anexo de Contrato no Fechamento

**Impacto Origami Lab:** ⭐⭐ 2/5  
**Impacto na Persona:** ⭐⭐ 2/5

---

### Contexto e Problema

Após o fechamento, o GP frequentemente já tem o contrato assinado em mãos. O sistema deveria permitir anexá-lo imediatamente enquanto o contexto está fresco, sem mudar de ferramenta.

### Objetivo

GP anexa contrato pós-fechamento em menos de 30 segundos. Step é claramente opcional — não bloqueia quem não tem o contrato ainda.

### Estado Atual

`contract_url` existe na tabela `projects`. Sem UI de upload pós-fechamento. Contrato precisa ser adicionado manualmente depois, se o GP lembrar.

---

### Jobs to be Done

**Funcionais:**
- Anexar o contrato assinado imediatamente após o fechamento sem mudar de ferramenta
- Ter o contrato acessível para toda a equipe do projeto no sistema

**Emocionais:**
- Sentir que o processo de fechamento está completamente documentado
- Não ter ansiedade sobre onde o contrato foi parar depois de assinado

**Social:**
- Demonstrar organização ao cliente quando ele pede uma cópia do contrato

---

### Fluxos

**F1 — Step Opcional Pós-Celebração**  
Após a animação de fechamento (J8, Seção 3), aparece um passo adicional:  
*"Deseja anexar o contrato agora?"*  
- Botão "Fazer upload" → abre file picker (aceita PDF, máximo 10MB)
- Botão "Pular por enquanto" → encerra o fluxo normalmente

Ao fazer upload: `contract_url` do projeto é atualizado. O arquivo também é criado em `project_files` com `category: 'contract'` para aparecer na aba de Arquivos do projeto (J12 de GP Projetos).

**F2 — Acesso Posterior**  
Se o GP pulou no fechamento, pode adicionar o contrato depois via aba Arquivos do projeto ou pelo perfil da oportunidade.

---

### Cenários-Limite

- Upload de arquivo acima de 10MB — mensagem de erro antes do upload começar?
- PDF corrompido — erro tratado graciosamente?
- GP clica em "Pular" acidentalmente — consigo desfazer sem refazer todo o processo de fechamento?

---

### Critério de Sucesso

GP anexa contrato em menos de 30 segundos. Step visualmente opcional (botão "Pular" em destaque igual ao de upload). Contrato aparece na aba Arquivos do projeto. Equipe documenta se vale a pena transformar isso em um micro-prompt pós-fechamento ou manter como step opcional.

---

---

# JORNADA J11
## Analytics Comercial

**Impacto Origami Lab:** ⭐⭐⭐⭐ 4/5  
**Impacto na Persona:** ⭐⭐⭐ 3/5

---

### Contexto e Problema

Dashboard em `/comercial` existe com métricas básicas. Faltam métricas mais profundas: tempo médio por etapa do pipeline, win rate por Linha de Serviço, análise de motivos de perda com concorrentes, oportunidades que precisam de atenção agora.

### Objetivo

GP responde em 2 minutos: onde o pipeline está travando, quais serviços convertem melhor e quais oportunidades precisam de atenção imediata.

### Estado Atual

Dashboard implementado com KPIs básicos (volume de oportunidades, conversão geral, funil visual). Sem análise por Linha de Serviço ou Modelo de Receita. Sem métricas de tempo por etapa.

---

### Jobs to be Done

**Funcionais:**
- Identificar em qual etapa do pipeline está travando mais
- Saber quais serviços e modelos de receita convertem melhor
- Entender os padrões de perda para ajustar a abordagem comercial

**Emocionais:**
- Sentir que as decisões comerciais são baseadas em dados, não em intuição
- Não precisar montar relatório em planilha para responder perguntas do admin

**Social:**
- Apresentar resultados comerciais com clareza em reuniões de liderança

---

### Fluxos

**F1 — Novas Visualizações**  
- Tempo médio por etapa: quantos dias em média as oportunidades ficam em cada coluna antes de avançar ou ser arquivada
- Win rate por Linha de Serviço: % de oportunidades fechadas vs. arquivadas por tipo de serviço
- Win rate por Modelo de Receita: quais modelos convertem mais
- Motivos de perda: gráfico de pizza com motivos + concorrentes mais citados
- Top GPs por conversão (admin only)

**F2 — KPI "Oportunidades que Precisam de Atenção"**  
Card clicável mostrando contagem de oportunidades com:
- Follow-up vencido
- Paradas além do threshold de dias da etapa atual

Clicar no card → lista filtrada das oportunidades.

**F3 — Filtros Novos**  
Adicionar aos filtros existentes: Serviço (dentro da linha de serviço), Modelo de Receita, GP responsável (admin only), Etapa atual.

---

### Cenários-Limite

- Poucos dados (pipeline recém-criado) — métricas exibem estado orientativo "dados insuficientes"?
- Concorrente com nome digitado de formas diferentes ("Totvs", "TOTVS", "totvs") — aparece em 3 entradas separadas na análise de perdas?

---

### Critério de Sucesso

GP responde as 3 perguntas-chave em menos de 2 minutos. Métricas de tempo por etapa calculadas corretamente. KPI de oportunidades que precisam de atenção clicável e com lista correta. Equipe documenta 3 melhorias de UX.

---

---

## Resumo de Prioridades

| # | Jornada | Impacto | Sprint |
|---|---|---|---|
| J2 | Gestão de Oportunidades (renomeação) | Alta | Sprint 1 |
| J1 | Cadastro e Gestão de Clientes | Alta | Sprint 1 |
| J3 | Pipeline com Progressão ⚠️ | Alta | Sprint 2 (após Admin J4) |
| J5 | Comentários e Follow-up | Alta | Sprint 2 |
| J7 | Arquivamento | Média | Sprint 2 |
| J8 | Negócio Fechado | Alta | Sprint 3 |
| J4 | Orçamentação — modelos alta prioridade | Alta | Sprint 3 |
| J4 | Orçamentação — modelos média prioridade | Média | Sprint 4 |
| J9 | Anexo de Contrato | Baixa | Sprint 4 |
| J11 | Analytics Comercial | Média | Sprint 4 |

---

## Dependências

| Dependência | Impacto |
|---|---|
| **Admin J4 antes de J3 e J4** | Migration de catálogo necessária para service_line_id |
| **J8 antes de J9** | Contrato é anexado como step do fechamento |
| **J7 antes de J11** | Motivos de perda e concorrentes alimentam Analytics |

---

*Documento gerado para o Hackathon Origami Pulse — 04/06/2026*  
*Equipe Koi 🐟 — GP Comercial + GP Projetos*
