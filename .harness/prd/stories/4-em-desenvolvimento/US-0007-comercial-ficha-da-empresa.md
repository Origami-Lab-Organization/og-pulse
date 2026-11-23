# US-0007 — Avaliar a empresa pela ficha antes de decidir

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 2026-11-18
- **Relacionadas:** US-0002, US-0006, US-0008, US-0010, US-0015, ADR-0041, ADR-0042, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** abrir a ficha da empresa com tudo que a base sabe sobre ela,
**para** decidir se vale abrir oportunidade sem sair da tela.

### Escopo

- Inclui: ficha em gaveta à direita, por cima da lista, ao clicar na linha (ou Enter com a
  linha em foco), com as seções:
  - **identificação:** nome fantasia e razão social, CNPJ, natureza jurídica, abertura e
    idade, cidade e UF, distância de Formiga (US-0015);
  - **atividade:** CNAE principal com código e descrição, setor e ramo, e as atividades
    secundárias (quantidade, com a lista ao expandir);
  - **tamanho:** funcionários na RAIS, unidades com funcionários, filiais ativas, capital
    social e faturamento estimado com a conta (US-0006), incluindo o aviso de Lucro Real
    provável;
  - **fit prévio por frente:** a nota de cada frente da Origami e o motivo de cada ponto,
    pela mesma regra da Prospecção (ADR-0042);
  - **dívida ativa da União:** total, em cobrança, ajuizada e número de inscrições;
  - **sócios e representantes:** nome, qualificação (ex.: Sócio-Administrador) e ano de
    entrada de cada um, com quem administra no topo; para sócio empresa, a raiz do CNPJ;
  - **contato na Receita:** e-mail e telefones que a empresa declarou, com link para escrever
    ou ligar;
  - **na Prospecção:** quando a empresa já tem oportunidade em andamento, a etapa e quem
    cuida.
- Não inclui:
  - ações no rodapé (Abrir oportunidade, Não agora e Descartar): entram com a US-0008 e a
    US-0010;
  - CPF e faixa etária dos sócios (nunca, ADR-0041);
  - editar dados da empresa.

## Critérios de aceite

**Cenário 1: abrir e fechar**

- **Quando** clico numa linha, ou aperto Enter com ela em foco;
- **Então** a ficha abre à direita, por cima da lista, com as seções acima;
- **E** Esc, o botão de fechar ou um clique fora fecham a ficha e devolvem o foco à linha.

**Cenário 2: fit explicado**

- **Então** vejo a nota de cada frente da Origami e o motivo de cada ponto;
- **E** os pontos que dependem de regime tributário, site, fomento e contratos com o governo
  aparecem como pendentes, com o aviso de que entram quando a empresa vira oportunidade e a
  consulta da Receita é feita.

**Cenário 3: faturamento e Lucro Real**

- **Então** vejo o faturamento estimado com a conta e a origem (pela RAIS, aproximado ou
  pelo porte), ou o valor do time, quando houver (US-0006);
- **E**, acima de R$ 78 mi, o aviso "Lucro Real provável", com a lei citada.

**Cenário 4: dívida ajuizada**

- **Dado** uma empresa com dívida ajuizada;
- **Então** a ficha avisa: "Dívida ajuizada pode dificultar FINEP e crédito público; confirme
  com o time de financiamento."

**Cenário 5: empresa já na Prospecção**

- **Dado** que a empresa já tem oportunidade em andamento;
- **Então** a ficha mostra a etapa e quem cuida, com o link para a oportunidade.

**Cenário 6: base fora do ar**

- **Dado** que a base da Receita não responde;
- **Então** a ficha mostra que não deu para carregar, com "Tentar de novo".

## Decisões (Victor Couto, 2026-11-16 e 2026-11-18)

- A ficha abre como gaveta à direita, como no protótipo (16/11).
- A ficha vem primeiro, só para avaliar; as ações do rodapé entram com a US-0008 e a
  US-0010 (18/11).
- Com dívida ajuizada, a ficha avisa com cautela sobre FINEP e crédito público, pedindo
  confirmação ao time de financiamento (18/11).
- O aviso de Lucro Real provável aparece na ficha, não na tabela (18/11, US-0006).
- Na validação da tela (18/11): os nomes dos sócios entram na ficha, com qualificação e ano
  de entrada, pela minimização do ADR-0041 (sem CPF nem faixa etária); "Funcionários" sem
  "(RAIS)"; e-mail e telefones da Receita aparecem na ficha, antes da Prospecção (dado
  público do cadastro, com aviso de que pode estar desatualizado ou ser do contador);
  distância sem "em linha reta".
- O total da dívida ativa aparece para quem vê a base (`prospeccao:ler`), como já aparece na
  lista; é dado público da PGFN (18/11).

## Pontos em aberto

### Hipóteses para validar

- O aviso sobre dívida ajuizada e FINEP orienta bem o time. Origem: protótipo; o texto pode
  mudar depois da validação do time de financiamento.

## Contexto técnico

- **Termos do domínio:** nota de fit por frente — fonte: `src/lib/prospecting/fit.ts`
  (ADR-0042); Rede da empresa — fonte: glossário; faturamento estimado — US-0006.
- **Comportamento atual:** PROVADO — a ficha atual é `CompanyDetailDialog` e só existe
  para empresa já cadastrada na Prospecção; a lista da base não abre ficha.
- **Comportamento esperado:**
  - Edge Function `empresas-receita` com o modo `ficha` (`{ modo: 'ficha', cnpj }`): todas
    as colunas de `pulse.empresas` da matriz, com a descrição das atividades secundárias
    (`public.cnaes`), e, lido com a sessão da pessoa (RLS), o faturamento do time e a
    oportunidade em andamento, se houver;
  - o fit por frente calculado na tela por `companyFit`, com os mesmos dados que a carga usa
    para o fit prévio (sem reimplementar a regra);
  - gaveta com o `Sheet` do shadcn, título acessível e foco de volta à linha.
- **Superfícies conhecidas:**
  - `supabase/functions/empresas-receita/index.ts`;
  - `src/hooks/useEmpresasReceita.ts`;
  - `src/components/prospeccao/receita/` (tabela e ficha nova);
  - `src/lib/prospecting/fit.ts`, `faturamentoEstimado.ts`.
- **Restrições e padrões aplicáveis:**
  - nunca faixa etária nem CPF de sócio — fonte: ADR-0041;
  - fit pela mesma regra, sem reimplementar — fonte: ADR-0042;
  - a base fica na VPS; o Supabase não guarda nada dela — fonte: ADR-0053;
  - estados de carregamento, vazio e erro; foco e Esc — fonte:
    `.harness/patterns/design-system.md`.
- **Provas esperadas:** ficha de uma indústria com RAIS, de uma empresa sem RAIS e de uma com
  dívida ajuizada; fit com motivos e pendências; empresa já no Pipeline; base fora do ar.
- **Fora do escopo:** ações do rodapé (US-0008, US-0010); editar dados.

## Implementação

Ensaio do modo `ficha` da Edge Function contra a base real (18/11/2026).

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Tecno2000: natureza "Sociedade Empresária Limitada", 13 atividades secundárias com descrição, 404 funcionários, 4 unidades, 5 filiais, 6 sócios, 0 km (80 ms) |
| 2 | Fit por frente calculado na tela por `fitDaBase`, a mesma função da carga (`scripts/receita/sincronizar-base.ts`) |
| 3 | Faturamento da Tecno2000: ≈ R$ 731 mi pela RAIS, com a conta e o aviso de Lucro Real |
| 4 | Prumo: dívida total R$ 822 mil, ajuizada R$ 531 mil, 2 inscrições; aviso de FINEP na ficha |
| 5 | Oportunidades em andamento lidas com a sessão da pessoa (RLS); conferir na tela |
| 6 | CNPJ fora da base: 404 "Empresa não encontrada na base."; CNPJ inválido: 400 |

- `pulse_api` ganhou leitura de `public.naturezas_juridicas` (natureza por extenso), em
  18/11/2026, registrada em `scripts/receita/vps/preparar-vps.sql`.
- Sócios pela visão `pulse.socios` (nome, qualificação, entrada, tipo e raiz do CNPJ de sócio
  empresa), criada pelo administrador em 18/11/2026: o `pulse_api` lê a visão e recebe
  "permission denied" na tabela `public.socios`. Ensaio: Tecno2000 com 6 Sócios-Administradores;
  Prumo com o Administrador e a CFR Participações S.A. (sócia empresa, raiz 17.125.387).
- Contato pela visão `pulse.contatos` (CNPJ, e-mail e dois telefones de
  `public.estabelecimentos`), criada pelo administrador em 18/11/2026; Tecno2000:
  contabilidade2@tecno2000.com.br, (37) 3329-1000.
- A tabela de qualificações da base de origem veio vazia; os 35 códigos que aparecem nas
  empresas da base foram conferidos na BrasilAPI (`src/lib/prospecting/qualificacoesDeSocio.ts`).
- **Edge Function:** publicada em 18/11/2026.
- **Tela:** validada pelo Victor em 18/11/2026.
