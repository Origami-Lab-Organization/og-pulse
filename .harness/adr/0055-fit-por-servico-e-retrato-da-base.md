# ADR 0055: Fit por serviço e retrato da Base na empresa do Pulse

- Status: aceito
- Data: 2026-11-24
- Decisores: Victor Couto
- Relacionados: ADR-0042 (inteligência por regra, sem IA), ADR-0053 (base da Receita na VPS),
  US-0014, US-0038

## Contexto

A nota de fit do ADR-0042 tinha três frentes (software, financiamento, consultoria) e pesava
sobretudo porte e idade. Em 23/11/2026 apareceu o efeito: a Base só tem médias e grandes, então
1,7 milhão de empresas empatavam no fit prévio, e no Pulse quase toda indústria com mais de 5
anos tirava 75. A ordem da tela Empresas perdia o sentido, e o indício de Necessidade do BANT
valia para todas (a US-0038 já tirou os indícios da entrada em "Oportunidade qualificada").

Os números que separam as empresas — funcionários da RAIS, dívida ativa ajuizada, distância de
Formiga e faturamento estimado — moram na Base, na VPS. O ADR-0053 decidiu que nada da Base fica
no Supabase; as empresas do Pulse não tinham nenhum deles. O ADR-0042 também dizia que o
faturamento não entra na nota.

Na Qualificação, o comercial ainda não sabe qual serviço oferecer; uma nota por serviço ajuda a
decidir. "Financiamento de inovação" juntava dois serviços com regras diferentes: Lei do Bem
(só Lucro Real) e Captação de recursos (FINEP, BNDES, FAPs; pedem CND).

## Decisão

1. **Um fit por serviço**, nas linhas de serviço da Origami: **Studio de Produto**, **Lei do
   Bem**, **Captação de recursos** e **Consultoria Estratégica**. Ventures fica sem fit (é
   investimento, não perfil de conta). Em cada serviço a soma dos pontos máximos é exatamente
   100; a dívida ativa ajuizada só tira. Pesos na US-0014.
2. **Sinais novos**: funcionários (RAIS, ou os confirmados pelo time), dívida ativa ajuizada,
   distância de Formiga e faturamento ou tipo de conta. **O faturamento passa a entrar na nota**
   (muda o ADR-0042), com peso moderado, porque já pesa no tipo de conta e no Budget do BANT.
3. **Porte e idade viram piso**, com peso pequeno.
4. **Regras de corte**: fora do Lucro Real, a Lei do Bem é 0; na Base, onde o regime nunca é
   consultado, "regime não informado" não soma; abaixo de 20, nenhum serviço é apontado como "o
   de maior fit" (a ordem não muda).
5. **Retrato da Base na empresa do Pulse** (exceção registrada ao ADR-0053): ao mover para
   qualificação, a empresa guarda funcionários da RAIS, dívida ajuizada, distância e faturamento
   estimado (com a base dele), com a data. A Edge Function `retrato-da-base`, só com a chave de
   serviço, refaz o retrato de todas as empresas do Pulse toda segunda-feira e depois de cada
   carga. Só esses números, nunca a base inteira. O faturamento "calculado" (US-0008) já tinha
   aberto o precedente.
6. **Na Base**, a carga grava a nota de cada serviço (`fit_studio`, `fit_lei_do_bem`,
   `fit_captacao`, `fit_consultoria`), com índices, além do `fit_previo` (a maior) e do
   `fit_frente`; a tela ordena e filtra pelo serviço escolhido.
7. Continua valendo do ADR-0042: regra explícita, sem IA, cada ponto com o motivo; empresa
   inativa tem 0; sem dados da Receita, não há nota. A mesma função (`src/lib/prospecting/fit.ts`)
   serve à carga, à tela e ao MCP.

## Consequências

- **Benefícios:** a Base ordena por quem importa (indústria maior, perto, sem dívida); na
  Qualificação, o comercial vê qual serviço oferecer; o indício N do BANT volta a separar.
- **Custos:** quatro colunas e quatro índices na VPS (a carga fica um pouco mais longa); uma Edge
  Function e uma tarefa agendada a mais; o retrato pode ficar até uma semana atrás da Base.
- **Riscos:** os pesos não foram calibrados com resultados — recalibrar com Ganhos e Perdas numa
  história própria, como o ADR-0042 previa; o regime da BrasilAPI atrasa cerca de dois anos, e
  a Lei do Bem pode zerar por regime antigo (o `company-watch` avisa quando o regime muda).
- **Como reverter:** rollback da migration `20261124160000` (tira o retrato e a tarefa) e voltar
  `fit.ts` às três frentes; a carga seguinte refaz a Base.

## Evidências

- US-0014; migration `20261124160000_retrato_da_base`; Edge Function `retrato-da-base`;
  `scripts/receita/vps/esquema.sql`; simulação da carga de 24/11/2026 (distribuição do fit
  prévio antes e depois, na US-0014).
