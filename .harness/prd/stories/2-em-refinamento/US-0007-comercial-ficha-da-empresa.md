# US-0007 — Avaliar a empresa pela ficha antes de decidir

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0002, US-0006, US-0008, US-0010, ADR-0041, ADR-0042

## Descrição

**Como** pessoa do comercial,
**quero** abrir a ficha da empresa com tudo que a base sabe sobre ela,
**para** decidir se vale abrir oportunidade sem sair da tela.

### Escopo

- Inclui: ficha lateral ao clicar na linha, com:
  - situação, matriz e natureza jurídica;
  - atividade principal com código CNAE, ramo e número de atividades secundárias;
  - tamanho: funcionários, unidades, filiais ativas, faturamento estimado com a conta,
    capital social, abertura e idade, cidade e UF;
  - fit prévio por frente, com o motivo de cada ponto;
  - dívida ativa da União: total, em cobrança, ajuizada e inscrições;
  - rede e contato: quantos sócios e representantes, e se há e-mail ou telefone na Receita;
  - rodapé com Abrir oportunidade, Não agora e Descartar (US-0008 e US-0010).
- Não inclui: nomes dos sócios, e-mail e telefone, que só aparecem depois que a
  empresa entra na Prospecção.

## Critérios de aceite

**Cenário 1: abrir**

- **Quando** clico numa linha;
- **Então** a ficha abre ao lado, com as seções acima;
- **E** Esc ou o botão de fechar devolvem o foco à lista.

**Cenário 2: fit explicado**

- **Então** vejo a nota de cada frente da Origami e o motivo de cada ponto;
- **E** os pontos que dependem de regime tributário e site aparecem como pendentes,
  com o aviso de que entram ao abrir a oportunidade.

**Cenário 3: dívida ajuizada**

- **Dado** uma empresa com dívida ajuizada;
- **Então** a ficha avisa que isso costuma travar FINEP e outras linhas de crédito público.

**Cenário 4: empresa com oportunidade em andamento**

- **Dado** que a empresa já tem oportunidade em andamento;
- **Então** a ficha mostra a etapa e quem cuida;
- **E** não oferece Abrir oportunidade.

## Pontos em aberto

### Hipóteses para validar

- O aviso sobre dívida ajuizada e FINEP vale como orientação ao time. Origem:
  protótipo; precisa de validação de quem cuida de financiamento.

### Provocações para produto

- Mostrar o total da dívida ativa de uma empresa — impacto possível: é dado público
  da PGFN, mas é financeiro; vale confirmar quem pode ver.

## Contexto técnico

- **Termos do domínio:** nota de fit por frente — fonte: `src/lib/prospecting/fit.ts`
  (ADR-0042); Rede da empresa — fonte: glossário.
- **Comportamento atual:** PROVADO — a ficha atual é `CompanyDetailDialog` e só existe
  para empresa já cadastrada na Prospecção.
- **Restrições e padrões aplicáveis:** nunca faixa etária nem CPF de sócio — fonte:
  ADR-0041; fit calculado pela mesma regra, sem reimplementar — fonte: ADR-0042.
- **Provas esperadas:** render das seções; fit com motivos; empresa já no Pipeline
  sem Abrir oportunidade.
- **Fora do escopo:** editar dados da empresa.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
