# ADR 0041: Dados da Receita e rede de sócios na Prospecção

- Status: aceito
- Data: 2026-09-29
- Decisores: Italo Castro

## Contexto

O pedido foi que a busca por CNPJ trouxesse o máximo possível da empresa e já cadastrasse
tudo: regime tributário, sócios, pessoas relacionadas e as redes sociais delas. Para a
Origami, parte desses dados decide antes do primeiro toque se vale abordar e com qual
serviço:

- **Lei do Bem** só alcança empresa tributada pelo Lucro Real, e a Receita informa a forma
  de tributação ano a ano.
- **Financiamento de inovação** (FINEP, BNDES, FAPs) e **software sob medida para indústria** dependem de porte, idade, situação e setor (CNAE).

Fontes avaliadas em 29/09/2026:

- A base pública da Receita (BrasilAPI) traz, de graça, regime por ano, porte, capital
  social, situação, abertura, CNAEs, endereço, telefone e e-mail de cadastro, e o quadro de
  sócios (QSA).
- Faturamento e número de funcionários **não são públicos**. Só existem como estimativa de
  provedores pagos.
- Redes sociais de sócios **não têm fonte pública**. Raspar o LinkedIn viola os termos dele e
  expõe a Origami juridicamente.

## Decisão

1. A consulta de CNPJ grava o retrato da Receita em `prospect_companies`. Regime, porte,
   capital, abertura e situação ficam em colunas próprias, porque viram selo. O resto fica
   em `receita` jsonb. A gravação é a RPC `save_prospect_company_receita`, que atualiza
   empresa e sócios na mesma transação e é usada pela tela e pelo MCP. Nome, CNPJ e segmento
   que a pessoa já escreveu não são sobrescritos.
2. Os sócios ficam em `prospect_company_partners`, ligados à **empresa**. Eles não viram
   contato sozinhos; "Virar contato" cria o contato quando alguém decide abordar a pessoa.
   Reconsultar a Receita atualiza o quadro pelo nome, sem duplicar. Quem saiu do quadro fica
   `ativo = false` e não é apagado.
3. **Minimização (LGPD).** Do sócio pessoa física guardamos só nome, qualificação e data de
   entrada. Faixa etária e CPF, mesmo mascarado, nunca são guardados; um CHECK garante que o
   campo CNPJ só existe para sócio que é empresa. A base legal é o interesse legítimo na
   prospecção B2B, limitado ao que o comercial usa.
4. **Redes sociais e telefone dos sócios são manuais.** A tela monta o link de busca de
   pessoas do LinkedIn (nome + empresa), a pessoa confirma o perfil e cola o link. Instagram
   e telefone são informados por quem conduz. Nenhuma fonte automática preenche esses campos.
5. **Selos só na ficha**, sem filtro novo:
   - Lei do Bem pelo regime mais recente: "Lucro Real — elegível", "Fora do Lucro Real" ou
     "Regime não informado". Regime vazio **não** é "não elegível".
   - Porte em linguagem de comercial.
   - Alerta quando a situação não é ATIVA.
   A regra fica em `src/lib/prospecting/receita.ts`, um módulo puro que o MCP importa.
6. O acesso segue `prospeccao:ler` e `prospeccao:editar`, sem capacidade nova. A policy da
   tabela de sócios é a mesma da empresa, e o tenant vem sempre da empresa (trigger
   `prospect_company_partners_guard`, ADR-0021).

## Consequências

- **Benefícios:**
  - A qualificação para a Lei do Bem sai do primeiro clique em vez da terceira reunião.
  - O comercial passa a saber com quem falar (diretores e sócios-administradores).
  - Tela e chat mostram o mesmo retrato.
- **Custos:**
  - A consulta depende da BrasilAPI. Se ela cair, o cadastro manual continua.
  - O regime por ano às vezes vem vazio, e aí só a conversa resolve.
- **Riscos:**
  - Os dados de sócio são pessoais. Qualquer uso novo, como disparo em massa, exige
    revisitar este ADR.
  - Faturamento estimado continua fora; se virar necessidade, é contrato com provedor pago,
    com chave numa Edge Function.
- **Como reverter:** `supabase/rollback/20260929140000_prospect_company_receita_rollback.sql`.

## Evidências

- Migration: `supabase/migrations/20260929140000_prospect_company_receita.sql`.
- Ensaio em 29/09/2026 sobre o dump do schema de produção:
  - Retrato real do CNPJ 00.000.000/0001-91: Lucro Real 2024, porte "Demais", 41 sócios.
  - Na reconsulta com um sócio a menos, ele ficou inativo, o LinkedIn colado foi mantido e o
    nome digitado venceu o da Receita.
  - O tenant do sócio foi herdado da empresa.
- Contrato da integração: `.harness/integrations/brasilapi-cnpj.md`.
