# Integração: base da Receita na VPS

- Status: **em desenvolvimento** desde 16/11/2026 (US-0001, US-0002, ADR-0053).
- Onde: tela Comercial > Empresas, aba "A classificar".
- Código: carga em `scripts/receita/sincronizar-base.ts`; leitura pela RPC
  `listar_empresas_receita` (migration `20261116120000`); tela em
  `src/components/prospeccao/receita/`.

## Origem

PostgreSQL `cnpj` numa VPS do Victor, com os dados abertos da Receita (empresas,
estabelecimentos, sócios), a RAIS 2025 e o resumo da dívida ativa da PGFN. Mapa das
tabelas, volumes e índices em `.harness/prd/README.md` ("A base mapeada").

- **Acesso:** usuário só de leitura `pulse_leitura` (SELECT no schema `public`), pelo
  túnel SSH `ssh -N -L 5433:localhost:5432 root@<vps>`. A porta do Postgres não abre
  para a internet.
- **Credenciais:** `~/.config/og-pulse/receita-db.env` (permissão 600), fora do repositório.
  A senha apareceu num print em 15/11/2026: trocar antes da primeira carga em produção
  (`ALTER ROLE pulse_leitura PASSWORD '...'` na VPS e no arquivo).
- **Atualização da base na VPS:** processo do Victor, fora do Pulse.

## Contrato

O script copia o recorte abaixo para o Supabase, numa transação só.

| Pulse (`receita_empresas`) | VPS | Observação |
|---|---|---|
| `cnpj`, `cnpj_basico` | `estabelecimentos` | só `situacao_codigo = '02'` (Ativa), `matriz_filial = 'Matriz'`, `uf <> 'EX'` |
| `razao_social`, `natureza_juridica`, `capital_social` | `empresas` (`capital_social_valido`) | a base só tem porte "Demais" |
| `nome_fantasia`, `nome_exibicao` | `estabelecimentos.nome_fantasia` | exibição = fantasia, senão razão social |
| `cnae_principal`, `cnaes_secundarios` | `estabelecimentos` | descrições em `receita_cnaes` |
| `data_inicio_atividade`, `municipio`, `uf` | `estabelecimentos` | |
| `funcionarios`, `unidades_com_funcionarios` | `empresas_funcionarios_total` | nulo = sem RAIS (cerca de 80% da base) |
| `filiais_ativas` | contagem em `estabelecimentos` | filiais com situação Ativa |
| `socios` | contagem em `socios` | **só a quantidade**: nada de nome, CPF ou faixa etária (ADR-0041) |
| `divida_total`, `divida_em_cobranca`, `divida_ajuizada`, `inscricoes_divida` | `pgfn_resumo` | nulo = sem inscrição |
| `tem_email`, `tem_telefone` | `estabelecimentos.email`, `telefone_1` | só se existe; o contato em si não é copiado |
| `fit_previo`, `fit_frente` | calculado pelo script | `src/lib/prospecting/fit.ts`, sem regime nem site (ADR-0042) |
| `faturamento_estimado` | — | US-0006, ainda vazio |

Tabelas de apoio: `receita_cnaes` (de `cnaes`) e `receita_naturezas` (de
`naturezas_juridicas`). A data e o total da carga ficam em `receita_base`.

## Como rodar

```bash
# 1. túnel aberto num terminal
ssh -N -L 5433:localhost:5432 root@<vps>
# 2. simulação: lê e resume, não grava
npx vite-node scripts/receita/sincronizar-base.ts
# 3. carga: grava no Supabase (fora do horário comercial)
SUPABASE_DB_URL='postgresql://...' npx vite-node scripts/receita/sincronizar-base.ts -- --aplicar
```

Usa o `psql` da máquina; sem ele, o do container `postgres:16-alpine`.

## Falhas

- **Túnel fechado ou VPS fora:** o script falha na leitura, antes de qualquer escrita.
- **Estrutura da VPS mudou:** o script falha com o erro do Postgres; a tela continua com a
  carga anterior.
- **Durante a carga:** o `TRUNCATE` segura a tabela até o `COMMIT`; a tela pode mostrar
  "base indisponível" nesse intervalo.
- O log do script só traz contagens e mensagens de erro, nunca dado de empresa ou conexão.
