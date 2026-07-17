# ADR 0009: Reconhecimento facial no registro de ponto

- Status: aceito (implementação técnica) — **pendente revisão jurídica/compliance antes de produção com colaboradores reais**
- Data: 2026-07-19
- Decisores: Aline (dev)

## Contexto

O módulo de Jornada/Ponto já tinha selfie opcional (registro visual, sem
verificação — ver sessão anterior). Foi pedido reconhecimento facial de
verdade: verificar que quem bateu o ponto é de fato o colaborador cadastrado.

Diferente da selfie simples, isso envolve **dado biométrico** — categoria de
dado pessoal sensível sob a LGPD (Art. 5º, II), com exigências específicas:
base legal e consentimento explícito e destacado (não pode estar embutido em
termos de uso genéricos), informação clara sobre a finalidade, e direito do
titular de solicitar exclusão a qualquer momento (Art. 18).

## Decisão

1. **Abordagem técnica: on-device, sem serviço externo.** Biblioteca
   `@vladmandic/face-api` (fork mantido do face-api.js, TensorFlow.js) rodando
   inteiramente no navegador do colaborador. Nenhuma foto ou descriptor facial
   é enviado a serviço de terceiros (AWS Rekognition, Azure Face, Google
   Vision etc.) — elimina a questão de transferência internacional de dado
   biométrico e reduz a superfície de risco.
2. **Modelos carregados via CDN (jsdelivr), não commitados no repo.** Os
   pesos do modelo (~6MB) não são versionados no Git — `boundaries.md` veda
   commitar "arquivos gerados volumosos". Carregados em runtime de
   `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/` (versão
   pinada à instalada, para evitar incompatibilidade de formato). A lib em si
   é `import()` dinâmico — vira chunk separado (~1.3MB), só baixado por quem
   usa o registro de ponto ou o cadastro facial, não no bundle principal.
3. **Dado minimizado: só o descriptor numérico é armazenado.** A tabela
   `time_punch_face_profiles` guarda um array de 128 floats (embedding
   facial) — nunca a foto de cadastro. A foto capturada em cada ponto (quando
   há verificação) já seguia o fluxo de selfie existente e é comparada
   localmente antes de descartar a referência em memória.
4. **Consentimento explícito e específico, com opção de exclusão.** Tela
   dedicada (`FaceEnrollmentCard`) explica o que é coletado, a finalidade, que
   a comparação é local, e que nunca bloqueia o ponto. Exige checkbox marcado
   antes de habilitar a captura. Versão do texto de consentimento é
   registrada (`consentimento_versao`) para rastreabilidade caso o texto
   mude no futuro. Exclusão (`delete-face-profile`) é self-service, sem
   fricção nem justificativa exigida — direito de eliminação (Art. 18).
5. **Falha na verificação nunca bloqueia o ponto (soft-fail).** Câmera
   indisponível, rosto não detectado ou não-correspondência apenas gravam
   `time_entries.face_match_status = 'nao_confirmado'` (ou
   `'sem_verificacao'` se não há perfil cadastrado) para revisão de admin/RH
   na Auditoria — nunca impedem o colaborador de registrar o ponto. Mesmo
   princípio já usado para selfie e GPS nas fases anteriores.
6. **Sem etapa de aprovação/bloqueio automático por não-confirmação.** Uma
   marcação "não confirmada" é só um sinal para revisão humana — não gera
   ação automática (ex.: notificação, bloqueio de banco de horas). Se isso
   virar necessário, é uma nova decisão a ser tomada separadamente.

## Consequências

- Benefícios: nenhum dado biométrico sai da infraestrutura do produto;
  menor custo (sem cobrança por chamada de API); nenhuma nova credencial de
  serviço externo para gerenciar; UX consistente com o restante do módulo
  (nunca bloqueia o registro de ponto).
- Custos: precisão de reconhecimento um pouco menor que serviços cloud
  especializados; bundle da aplicação ganha um chunk adicional de ~1.3MB
  (mitigado por ser lazy-loaded); dependência de disponibilidade do CDN
  jsdelivr para carregar os modelos (sem modelos = sem verificação, mas o
  ponto continua funcionando normalmente).
- Riscos — **importante**: esta implementação cobre a base técnica do
  consentimento (tela, checkbox, versão registrada, exclusão self-service),
  mas **não substitui revisão jurídica/DPO** antes de habilitar com
  colaboradores reais. Recomendado, antes de produção: confirmar base legal
  formal, política de retenção documentada, e se é necessário um RIPD
  (Relatório de Impacto à Proteção de Dados) dado o uso de biometria em
  contexto de relação de trabalho (assimetria de poder empregador-empregado
  é um fator que a ANPD observa com atenção nesses casos).
- Como reverter: `time_punch_face_profiles` e as colunas
  `time_entries.face_match_*` / `time_tracking_settings.exigir_reconhecimento_facial`
  são aditivas e isoladas — podem ser removidas via migration de rollback.
  Remover a dependência `@vladmandic/face-api` do `package.json` desliga a
  funcionalidade no build.

## Evidências

- `supabase/migrations/20260719090000_face_recognition.sql`
- `supabase/functions/enroll-face-profile/index.ts`, `delete-face-profile/index.ts`
- `src/lib/faceRecognition.ts`, `src/components/timetracking/FaceEnrollmentCard.tsx`
- Decisões desta sessão: abordagem on-device, consentimento incluído nesta entrega, soft-fail em não-confirmação.
