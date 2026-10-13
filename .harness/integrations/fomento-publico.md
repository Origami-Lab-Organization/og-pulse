# Integração: fomento público por CNPJ

- Status: **ativa** desde 29/09/2026. BNDES e FINEP funcionam sem configuração. A Lei do Bem
  é carregada sozinha desde 13/10/2026 (ano-base 2024 em diante), e a chave do Portal da
  Transparência foi configurada em 13/10/2026.
- Código: Edge Function `supabase/functions/company-funding-check/index.ts` (botão
  "Consultar", na seção Fomento público da ficha da empresa), Edge Function
  `supabase/functions/lei-do-bem-sync/index.ts` (carga da Lei do Bem) e o script
  `scripts/import-fomento.mjs`.
- Migrations: `20260929160000_fomento_publico.sql`, com a tabela de referência
  `fomento_publico` e a coluna `prospect_companies.fomento`; `20261013120000_lei_do_bem_automatica.sql`,
  com os lotes conhecidos, a trava de leitura do índice, o recálculo das empresas e o cron.
- Decisão: ADR-0042.

## Fontes

| Fonte | Como entra | Detalhes |
|---|---|---|
| **BNDES** (operações não automáticas: diretas e indiretas não automáticas) | Consulta na hora, por CNPJ | `POST https://dadosabertos.bndes.gov.br/api/3/action/datastore_search` com `resource_id=6f56b78c-510f-44b6-8274-78a5b7e931f4` e `filters.cnpj` **com máscara**. Por GET o filtro dá 403 (WAF). Licença ODbL, atualização mensal. As operações indiretas automáticas vêm com CNPJ mascarado e ficam de fora (casamento só por nome seria incerto). |
| **FINEP** (projetos contratados: crédito, subvenção, subvenção descentralizada das FAPs, ICTs, ANCINE) | Importação periódica (semanal) | `node scripts/import-fomento.mjs finep --aplicar` baixa `https://download.finep.gov.br/Contratacao.xlsx` (7,5 MB; cabeçalho na linha 7 de cada aba). A aba "Condições de Financiamento" é ignorada porque repete os contratos de crédito. Ensaio de 29/09/2026: 19.072 linhas, 8.692 empresas. |
| **Lei do Bem** (MCTI, lotes do parecer técnico por ano-base) | Carga **automática** (`lei-do-bem-sync`), ano-base 2024 em diante | Detalhes na seção "Lei do Bem automática". A lista mostra quem foi **analisado**, não o resultado do parecer. Anos anteriores continuam manuais: `node scripts/import-fomento.mjs lei-do-bem --arquivo lote.txt --ano 2023 --aplicar`, com o PDF convertido por `pdftotext -layout`. |
| **Portal da Transparência** (contratos do governo federal com a empresa) | Consulta na hora, por CNPJ | `GET /api-de-dados/contratos/cpf-cnpj`, com cabeçalho `chave-api-dados`. A chave sai em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email (login gov.br prata/ouro) e vai no secret `TRANSPARENCIA_API_KEY` da função. Sem a chave, a tela mostra "fonte não configurada". Limite: 400 req/min. |

Sem CNPJ por empresa, e por isso fora: FAPEMIG (só o nome da instituição) e FAPESP. As
subvenções descentralizadas das FAPs já vêm com CNPJ pela FINEP.

## Lei do Bem automática (13/10/2026)

- **Fonte:** o índice de lotes do MCTI, `https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/paginas/lotes`.
  Os lotes do ano-base 2024 estão nele como PDF com texto (17 em 13/10/2026, 3.193 empresas).
  Os anos anteriores vêm em `.zip`/`.7z` e ficam fora da carga automática. O CAPTCHA
  registrado antes não apareceu: índice e PDFs abriram sem navegador em 13/10/2026.
- **Quando roda:** pelo cron `lei-do-bem-sync-hourly` (minuto 17 de toda hora) e a cada
  "Atualizar" do fomento, que chama a função com a chave de serviço antes de consultar.
- **O que faz:**
  1. lê o índice no máximo a cada 6 horas (`fomento_publico_varreduras`) e registra os PDFs
     novos como `pendente` em `fomento_publico_arquivos`;
  2. carrega até 4 lotes pendentes por chamada, pela cota de CPU da Edge Function (~70 ms
     por PDF medidos com `unpdf`). O ano-base vem do texto do PDF, e o do endereço é a reserva;
  3. grava pela mesma `import_fomento_publico` do script, com referência `AB<ano>`;
  4. recalcula `leiDoBem` e `leiDoBemAno` das empresas que já tinham fomento consultado
     (`recalcular_lei_do_bem_nas_empresas()`), sem esperar clique em cada uma.
- **Falhas:**
  - PDF que não baixa fica `falhou` e é tentado de novo, até 5 vezes. Depois disso deixa de
    segurar a lista e fica registrado para alguém olhar;
  - PDF sem nenhum CNPJ fica `sem_cnpj`, que é sinal de formato novo;
  - índice que não traz lote nenhum aparece no log como `lotesNoIndice: 0`.
- **Log:** só contagens (`lotesNoIndice`, `lotes`, `falhas`, `empresas`, `empresasAtualizadas`).

## O que a empresa guarda (`prospect_companies.fomento`)

O formato é `FundingSignals` de `src/types/receita.ts`:
- `leiDoBem`:
  - `ja_usa` quando o CNPJ está na lista importada;
  - `nunca_usou` quando a lista está completa e o CNPJ não aparece. A tela diz "Fora da Lei do
    Bem desde 2024": a lista automática não sabe de antes disso;
  - `desconhecido` enquanto a lista não está completa (`lei_do_bem_lista_completa()`: nenhum
    lote pendente nem falhando). **Desconhecido não é nunca usou.**
- `fomentos`: FINEP e BNDES, com ano, valor e instrumento, do mais recente para o mais
  antigo (até 30).
- `governo`: número e valor dos contratos federais, ou `null` sem a chave.

Uma fonte fora do ar não derruba as outras: o que respondeu é gravado, e a tela avisa o que
ficou sem resposta.

## Acesso

- `fomento_publico` é dado público de empresa, igual para todos os tenants. Qualquer
  autenticado lê; ninguém escreve pela API. A carga passa pela função
  `import_fomento_publico`, executável só pelo `service_role`, e reimportar não duplica.
- A Edge Function roda com o JWT de quem chama e grava na empresa sob a RLS
  (`prospeccao:editar`).

## Listas-alvo (base para prospectar)

`node scripts/montar-lista-alvos.mjs [--ufs MG,SP,RJ,ES] [--saida listas-alvo]` só **lê** dado
aberto e grava arquivos locais (`listas-alvo/`, fora do git). Nada vai para o banco: a
importação é feita pela tela, em Empresas › Importar CNPJs, que consulta a Receita,
classifica e traz a rede de sócios.

- **BNDES** (operações não automáticas): CNAE das seções B/C, porte MÉDIA ou GRANDE,
  natureza PRIVADA e UF no recorte.
- **FINEP** (projetos contratados): fora a aba de ICTs, a de condições e a da ANCINE, e fora
  nomes de instituto, fundação, universidade ou órgão público.
- **Prioridade:**
  1. MG primeiro (Rede Origami);
  2. inovação declarada;
  3. presença nas duas fontes;
  4. operação mais recente e maior valor.
- **Saída:**
  - `alvos-completo.csv`: todas, com prioridade, fontes, ano e valor;
  - `lote-mg-NN.txt` e `lote-sudeste-NN.txt`: 500 CNPJs cada, prontos para colar.

Rodada de 29/09/2026: 1.899 empresas no Sudeste. Em MG são 335: 249 da FINEP, 70 do BNDES e
16 nas duas fontes; 274 com inovação.
