# ADR 0042: Inteligência de prospecção por regra, sem IA

- Status: aceito
- Data: 2026-09-29
- Decisores: Italo Castro

## Contexto

Com os dados da Receita e a rede de sócios gravados (ADR-0041), o pedido foi transformar a
Prospecção em qualificação de conta para o foco atual da Origami: indústria, software sob
medida integrando os sistemas da empresa, financiamento de inovação e consultoria. Sprint 0
não existe mais. Duas restrições do mesmo dia:
- **sem IA por enquanto**: toda nota e todo sinal saem de regra explícita do sistema;
- usar só fontes públicas e gratuitas.

## Decisão

1. **Selo Indústria** pelo CNAE: seções B (05–09) e C (10–33), com o ramo em português.
   Olha também os CNAEs secundários (`src/lib/prospecting/industria.ts`).
2. **Cadastro em lote** na tela Empresas: CNPJs colados ou em CSV viram empresas com Receita
   e sócios. Deduplica pelo CNPJ no tenant e não cria contato.
3. **Leitor do site oficial** (Edge Function `company-site-scan`): traz redes, WhatsApp,
   telefones e e-mails genéricos da empresa, e as pistas de sistema (ERP, MES, Indústria
   4.0). Tem proteção contra SSRF (contrato em `integrations/site-da-empresa.md`).
4. **Fomento público** (Edge Function `company-funding-check` e a referência
   `fomento_publico`):
   - BNDES por consulta na hora;
   - FINEP por importação semanal;
   - Lei do Bem por importação manual, porque o gov.br bloqueia robô;
   - Portal da Transparência quando houver chave.
   Contrato em `integrations/fomento-publico.md`.
5. **Nota de fit** de 0 a 100 para três frentes (software/integração, financiamento e
   consultoria), com o motivo de cada ponto (`src/lib/prospecting/fit.ts`):
   - empresa inativa tem nota 0;
   - sem dados da Receita, não há nota: "não sei" não é "não serve";
   - a tela Empresas ordena pela maior nota, a partir da maior.
6. **Gatilhos** (Edge Function `company-watch`, cron diário): avisam quando a empresa entra
   no Lucro Real, muda de porte, deixa de estar ativa ou ganha sócio novo.
7. **Agrupar por empresa** no quadro da Prospecção: é uma chave, e a escolha fica lembrada
   no navegador.
8. A tradução da Receita passou a morar em `supabase/functions/_shared/receita.ts`, a única
   fonte usada pela tela, pelo MCP e pelas Edge Functions.

## Consequências

- **Benefícios:**
  - A lista industrial entra de uma vez.
  - A conta chega qualificada e com o argumento de entrada, e a nota se explica sozinha.
  - O comercial sabe quando ligar.
- **Custos:**
  - A FINEP pede importação semanal, e a Lei do Bem pede carga manual por ano-base.
  - Os pesos da nota são um ponto de partida: devem ser recalibrados com os Ganhos e Perdas
    reais depois de alguns meses.
- **Riscos:**
  - Sites que bloqueiam robô não são lidos, e a tela diz isso.
  - A BrasilAPI é pública e limita requisições; lote e cron andam devagar de propósito.
  - A lista do MCTI mostra quem foi analisado, não quem teve o benefício aprovado.
- **Sem IA:** quando ela entrar (resumo da conta, mensagem sugerida), usa estes mesmos sinais
  como entrada e vira um ADR novo.

## Evidências

- Migrations `20260929150000` (site), `20260929160000` (fomento) e `20260929170000` (cron),
  ensaiadas sobre o dump do schema de produção.
- Leitor de site testado em Tupy, Embraco e FIEMG. WEG e Marcopolo devolvem 403.
- SSRF recusou localhost, 169.254.169.254, 10.0.0.1, ftp, URL com senha e porta 8080.
- BNDES por CNPJ testado com operação real.
- FINEP lida em simulação: 19.072 linhas, 8.692 empresas.
