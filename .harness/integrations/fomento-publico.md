# Integração: fomento público por CNPJ

- Status: **ativa** desde 29/09/2026. BNDES e FINEP funcionam sem configuração. Lei do Bem
  depende de carga manual, e o Portal da Transparência depende de uma chave.
- Código: Edge Function `supabase/functions/company-funding-check/index.ts` (botão
  "Consultar", na seção Fomento público da ficha da empresa) e o script
  `scripts/import-fomento.mjs`.
- Migration: `20260929160000_fomento_publico.sql`, com a tabela de referência
  `fomento_publico` e a coluna `prospect_companies.fomento`.
- Decisão: ADR-0042.

## Fontes

| Fonte | Como entra | Detalhes |
|---|---|---|
| **BNDES** (operações não automáticas: diretas e indiretas não automáticas) | Consulta na hora, por CNPJ | `POST https://dadosabertos.bndes.gov.br/api/3/action/datastore_search` com `resource_id=6f56b78c-510f-44b6-8274-78a5b7e931f4` e `filters.cnpj` **com máscara**. Por GET o filtro dá 403 (WAF). Licença ODbL, atualização mensal. As operações indiretas automáticas vêm com CNPJ mascarado e ficam de fora (casamento só por nome seria incerto). |
| **FINEP** (projetos contratados: crédito, subvenção, subvenção descentralizada das FAPs, ICTs, ANCINE) | Importação periódica (semanal) | `node scripts/import-fomento.mjs finep --aplicar` baixa `https://download.finep.gov.br/Contratacao.xlsx` (7,5 MB; cabeçalho na linha 7 de cada aba). A aba "Condições de Financiamento" é ignorada porque repete os contratos de crédito. Ensaio de 29/09/2026: 19.072 linhas, 8.692 empresas. |
| **Lei do Bem** (MCTI, lotes do parecer técnico por ano-base) | Importação **manual** | O gov.br bloqueia robô (CAPTCHA F5). Baixe o PDF do lote, converta com `pdftotext -layout lote.pdf lote.txt` e rode `node scripts/import-fomento.mjs lei-do-bem --arquivo lote.txt --ano 2023 --aplicar`. A lista mostra quem foi **analisado**, não o resultado do parecer. |
| **Portal da Transparência** (contratos do governo federal com a empresa) | Consulta na hora, por CNPJ | `GET /api-de-dados/contratos/cpf-cnpj`, com cabeçalho `chave-api-dados`. A chave sai em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email (login gov.br prata/ouro) e vai no secret `TRANSPARENCIA_API_KEY` da função. Sem a chave, a tela mostra "fonte não configurada". Limite: 400 req/min. |

Sem CNPJ por empresa, e por isso fora: FAPEMIG (só o nome da instituição) e FAPESP. As
subvenções descentralizadas das FAPs já vêm com CNPJ pela FINEP.

## O que a empresa guarda (`prospect_companies.fomento`)

O formato é `FundingSignals` de `src/types/receita.ts`:
- `leiDoBem`:
  - `ja_usa` quando o CNPJ está na lista importada;
  - `nunca_usou` quando a lista foi importada e o CNPJ não aparece;
  - `desconhecido` quando a lista ainda não foi importada. **Desconhecido não é nunca usou.**
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
