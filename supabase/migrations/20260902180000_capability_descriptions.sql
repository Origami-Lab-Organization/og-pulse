-- PUL-204 — capacidade ganha descrição de escopo.
--
-- Problema (feedback de uso da tela):
--   "Ver projeto" não diz o que a pessoa vê. Pior: não diz o que ela NÃO vê. Financeiro,
--   horas e arquivos do projeto são capacidades separadas, e quem configura o perfil não
--   tem como saber disso pelo rótulo. O mesmo vale para "Ver margem", "Ver alocação",
--   "Editar projeto" e "Auditar ponto".
--
--   Rótulo curto não resolve: ou fica vago, ou fica uma frase longa demais para uma linha
--   de formulário.
--
-- Decisão:
--   Coluna `description` — o rótulo continua curto para varrer a lista com o olho, e a
--   descrição diz o escopo abaixo dele. Onde a capacidade tem escopo por relação (só onde
--   é gerente do projeto, só onde está alocado, só o próprio registro), a descrição diz —
--   é a informação que a matriz carrega e que o rótulo escondia.
--
--   Onde há risco real de confusão, a descrição diz explicitamente o que fica de fora.
--   "Ver projeto" sem essa ressalva faz quem configura presumir que inclui dinheiro.

ALTER TABLE public.capabilities ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.capabilities.description IS
  'Escopo da capacidade em uma frase, exibido sob o rótulo na tela de perfis. Diz o que '
  'inclui e, onde confunde, o que nao inclui. Mantido junto com a matriz em '
  '.harness/capability-matrix.md.';

UPDATE public.capabilities AS c SET description = v.description
FROM (VALUES
  ('financeiro:ler',                 'Custos, comissões, parcelas e fornecedores do projeto.'),
  ('financeiro:editar',              'Lançar e alterar custos, comissões e parcelas. Apenas nos projetos onde a pessoa é o gerente responsável.'),
  ('margem:ler',                     'Percentual e valor de margem do projeto. Depende de ver o financeiro.'),
  ('margem:ler-detalhe-mao-de-obra', 'Abre a composição de mão de obra dentro da margem, com o custo por pessoa alocada.'),
  ('custo-hora:ler',                 'Tarifa por hora dos cargos e parâmetros de precificação usados para montar orçamento.'),
  ('custo-hora:ler-relatorio',       'Relatório consolidado de custo por hora da operação.'),
  ('horas-projeto:ler',              'Horas planejadas e apontadas no projeto, sem valor financeiro. Colaborador vê apenas os projetos onde está alocado.'),
  ('folha:ler',                      'Folha de pagamento consolidada da empresa, com encargos e provisões.'),
  ('remuneracao-pessoa:ler',         'Salário, pró-labore e dividendos de cada pessoa, individualmente.'),
  ('remuneracao-pessoa:editar',      'Alterar salário, pró-labore e dividendos.'),
  ('parametro-folha:ler',            'Alíquotas e parâmetros usados no cálculo de encargos e custo de pessoa.'),
  ('pessoa:ler-identidade',          'Nome, cargo e foto dos colegas. É o que aparece em menções, seletores e equipe de projeto.'),
  ('pessoa:ler-ficha-completa',      'CPF, data de nascimento, endereço e dados bancários. Não inclui remuneração, que é capacidade própria.'),
  ('pessoa:editar',                  'Dados cadastrais, cargo e jornada. Não inclui remuneração nem perfil de acesso.'),
  ('pessoa:editar-papel',            'Criar perfis de acesso e definir o que cada um permite. Quem tem esta capacidade administra as permissões de todo mundo.'),
  ('pessoa:editar-elegibilidade-alocacao', 'Definir se a pessoa aparece como opção de alocação em projetos e nas métricas de capacidade.'),
  ('desligamento:executar',          'Conduzir o processo de desligamento: rescisão, documentos e verbas.'),
  ('pipeline:ler',                   'Oportunidades no Pipeline, com valor estimado, etapa e responsável.'),
  ('pipeline:editar',                'Criar e mover Oportunidades, registrar follow-up, interação e serviços.'),
  ('orcamento:ler',                  'Orçamentos e suas versões, com valores, escopo e margem prevista.'),
  ('orcamento:editar',               'Criar e alterar Orçamentos e versões.'),
  ('catalogo:ler',                   'Serviços e linhas de serviço disponíveis. Necessário para apontar horas e montar Orçamento.'),
  ('catalogo:editar',                'Criar, alterar e desativar serviços e linhas de serviço.'),
  ('cliente:ler',                    'Cadastro de clientes e seus contatos.'),
  ('cliente:editar',                 'Criar e alterar clientes e contatos.'),
  ('projeto:ler',                    'Ficha do projeto: nome, cliente, prazos, status e equipe. Financeiro, horas e arquivos são capacidades separadas. Colaborador vê apenas os projetos onde está alocado.'),
  ('projeto:editar',                 'Alterar dados, prazos, status e equipe do projeto. Apenas nos projetos onde a pessoa é o gerente responsável.'),
  ('portfolio:ler',                  'Visão de todos os projetos da empresa, com estágio e saúde de cada um.'),
  ('arquivo-projeto:ler',            'Documentos e arquivos anexados ao projeto. Colaborador vê apenas os projetos onde está alocado.'),
  ('alocacao:ler',                   'Grade de alocação da equipe: quem está em qual projeto e com quantas horas por mês.'),
  ('alocacao:editar',                'Alterar horas e pessoas na grade de alocação. Apenas nos projetos onde a pessoa é o gerente responsável.'),
  ('timesheet-proprio:apontar',      'Registrar as próprias horas em projetos e atividades.'),
  ('timesheet-terceiro:ler',         'Horas apontadas por outras pessoas, para acompanhar a carga do time.'),
  ('ponto:ler-proprio',              'As próprias marcações de ponto, resumo diário e banco de horas.'),
  ('ponto:ler-terceiro',             'Marcações de ponto e banco de horas de outras pessoas.'),
  ('ponto:aprovar',                  'Aprovar ou recusar marcações e pedidos de ajuste de ponto.'),
  ('ponto:ler-relatorio',            'Relatórios de ponto do período, por pessoa e por equipe.'),
  ('ponto:auditar',                  'Histórico de alterações de ponto, com autor, data e valor anterior.'),
  ('ponto:configurar',              'Regras de jornada, tolerância, banco de horas e travamento de período.'),
  ('ferias:solicitar',               'Pedir as próprias férias e acompanhar o saldo.'),
  ('ferias:aprovar',                 'Aprovar ou recusar pedidos de férias. Apenas de quem a pessoa é gestor designado.'),
  ('ferias:gerir',                   'Calendário de férias do time, com saldos e programação.'),
  ('vaga:editar',                    'Criar, alterar e encerrar vagas do Trabalhe Conosco.'),
  ('candidatura:ler',                'Candidaturas recebidas, com dados de contato do candidato.'),
  ('curriculo:ler',                  'Abrir o currículo anexado pelo candidato.'),
  ('okr:editar',                     'Definir e alterar objetivos e resultados-chave do ciclo.'),
  ('iniciativa:editar',              'Criar e alterar iniciativas ligadas aos objetivos.'),
  ('guardrail-estrategia:editar',    'Definir limites e indicadores de controle da estratégia.')
) AS v(key, description)
WHERE c.key = v.key;
