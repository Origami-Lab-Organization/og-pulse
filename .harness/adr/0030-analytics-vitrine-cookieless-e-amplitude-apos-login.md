# ADR 0030: Um analytics só (Amplitude), em modo vitrine sem cookies antes do login e modo produto depois

- Status: aceito em 2026-09-09 por Italo Castro ("só Amplitude mesmo")
- Data: 2026-09-09
- Decisores: Italo Castro (produto); implementação em PUL-239

## Contexto

Até 09/09/2026 o `src/main.tsx` iniciava o Amplitude com `autocapture` e **session replay a
100%** para todo visitante, antes de qualquer login: quem só passava pela home pública tinha
a sessão gravada, com cookie de identidade, sem banner de consentimento e sem menção na
política de privacidade. Na área logada isso é decisão de produto (a pessoa é funcionária de
um cliente que tem contrato com a Origami); numa página pública é exposição LGPD e ruído no
analytics de produto.

O padrão da casa (skill SEO & GEO) é analytics **cookieless** na vitrine, sem banner, com
Umami; outro provedor na vitrine exige ADR. Este é o ADR. Precisamos também medir GEO:
visitas vindas de chatgpt.com, perplexity.ai e gemini.google.com.

Alternativas consideradas:

1. **Umami na vitrine, Amplitude só na área logada.** Cumpre o padrão da casa sem
   configuração, mas exige mais uma conta e um painel, e nunca liga a visita ao cadastro e
   ao uso: são duas ferramentas sem ponte.
2. **Amplitude na home como estava, com banner de consentimento** e política de cookies
   reescrita. Rejeitada: banner derruba conversão da vitrine, e replay de visitante anônimo
   não tem uso de produto.
3. **Só Amplitude, em dois modos.** Escolhida: uma ferramenta, um painel, e o funil inteiro
   (visita → cadastro → uso) no mesmo lugar; a vitrine fica anônima por configuração.

## Decisão

1. **Modo vitrine** (`startVisitorAnalytics`, em `src/main.tsx`), para quem não tem sessão
   guardada: instância própria do SDK (`createInstance`, `instanceName: 'vitrine'`) com
   `identityStorage: 'none'` (nenhum cookie nem storage; device id só em memória),
   `trackingOptions.ipAddress: false`, **sem session replay**, autocapture só de páginas
   vistas e atribuição (referrer e UTM). É o que mede a home, termos, privacidade, 404,
   login e cadastro, e de onde a visita veio. Sem dado pessoal, sem banner.
2. **Modo produto** (`startProductAnalytics`), só quando `AuthContext` confirma funcionário
   ativo: a instância padrão, como sempre foi (autocapture completo, replay 100%, eventos
   nomeados), iniciada com o device id da vitrine para visita e uso ficarem na mesma linha do
   tempo quando acontecem no mesmo carregamento. Ao ligar, a vitrine cala
   (`setOptOut(true)`); no `signOut`, o produto cala e a vitrine volta.
3. **GEO medido no Amplitude** pela propriedade de atribuição (`referring_domain`):
   chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com. Complemento manual
   mensal: perguntar às IAs "o que é o Origami Pulse" e "software de PSA brasileiro" e
   registrar se somos citados.
4. A política de privacidade declara: site público sem cookies de rastreamento, sem IP e sem
   identificação; analytics de produto com gravação de sessão só depois do login.

## Consequencias

- Beneficios: vitrine em conformidade com LGPD sem banner; replay só de quem usa o produto;
  funil visita → cadastro → uso em um painel só; nenhuma conta nova para administrar.
- Custos: visitante anônimo conta como usuário mensal no plano do Amplitude (irrelevante no
  volume atual, a acompanhar se a home crescer); duas configurações do mesmo SDK no mesmo
  documento, concentradas em `src/lib/analytics.ts`.
- Riscos: o Amplitude processa fora do Brasil (transferência internacional coberta pelas
  cláusulas contratuais deles; o Umami Cloud teria o mesmo ponto). Session replay a 100% na
  área logada segue como decisão de produto a revisar quando houver clientes fora da Origami
  (custo do plano e política por tenant). Com `identityStorage: 'none'`, a mesma pessoa
  anônima em dois carregamentos vira dois visitantes: é o preço de não usar cookie, e o modo
  produto não sofre disso (identidade em cookie, como antes).
- Como reverter: voltar a inicialização única do Amplitude para `src/main.tsx` e apagar
  `src/lib/analytics.ts`; nada no banco.

## Criterio de revisao

- Quando o primeiro cliente externo entrar: revisar a taxa de replay e se o analytics de
  produto precisa de consentimento por tenant.
- Se o plano do Amplitude passar a cobrar pelos visitantes anônimos da vitrine, reavaliar a
  alternativa 1 (Umami) neste ADR.

## Evidencias

- Jira: PUL-239 (esta decisão), PUL-223 (épico), PUL-240 (política de privacidade v1).
- Código: `src/lib/analytics.ts`, `src/lib/session.ts`, `src/main.tsx`,
  `src/contexts/AuthContext.tsx` (`applyEmployeeResult`, `signOut`),
  `src/landing/content.ts` (privacidade).
- Skill: `harness-seo-geo-skill` ("outro provedor exige ADR"): este documento.
- Nenhuma medição anexada ainda: a vitrine passa a aparecer no Amplitude após o deploy.
