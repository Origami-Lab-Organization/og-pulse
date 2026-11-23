# ADR 0054: IA na qualificação comercial — propõe evidências, a pessoa decide

- Status: aceito para a fase 1; fase 2 proposta
- Data: 2026-11-19
- Decisores: Victor Couto

## Contexto

O ADR-0042 decidiu inteligência de prospecção por regra, sem IA, e previu que a IA, quando
entrasse, usaria os mesmos sinais e viraria um ADR novo. Em 19/11/2026 o fluxo comercial ganhou a
etapa Qualificação (US-0023) e o BANT da oportunidade (US-0022), e o Victor pediu IA para:

- desk research da empresa e das pessoas a abordar (notícias, site, vagas, posts públicos);
- reavaliar o BANT quando entra informação nova (notas, registros da oportunidade).

Restrições do mesmo dia:

- **A IA sugere, não decide.** Toda mudança no BANT passa pelo aceite da pessoa.
- **Usar as contas do Claude que o time já tem.** As assinaturas (claude.ai, Claude Code) são
  para pessoas; um servidor rodando sozinho precisa de chave de API (cobrança por uso).
- Dados pessoais (LGPD): o ADR-0041 apoia a prospecção B2B no interesse legítimo, com
  minimização; raspar redes sociais com login é proibido.

Alternativas consideradas:

1. Só chave de API, com botão e reavaliação automática no Pulse — fluxo todo dentro do Pulse,
   mas custo novo e mais desenho antes de saber se as propostas são boas.
2. Só pelo MCP, com a assinatura de cada pessoa — sem custo novo e rápido, mas depende de
   alguém pedir ao Claude; sem reavaliação automática.
3. **Duas fases: começar pelo MCP e levar para o Pulse quando o volume justificar.**

## Decisão

Opção 3.

**Regra comum às duas fases**

- A IA grava só **propostas** de evidência (`prospect_bant_evidencias.origem = 'ia'`, nasce
  `proposta`, trigger no banco); só a pessoa aceita ou recusa, e fica registrado quem e quando.
- Toda proposta tem **fonte** (link, ou referência a um registro da oportunidade).
- A IA lê só o que o Pulse já guarda da oportunidade e da empresa (Receita, sócios, contatos,
  fit, notas, registros) e páginas **públicas** da web. Nada de login em LinkedIn ou Instagram.
- Sobre pessoas, a proposta fica no que é **profissional e ligado à empresa** (cargo, papel,
  declarações públicas como executivo); nada de vida pessoal. A pessoa que aceita é quem
  responde pelo que entra.
- Proposta recusada fica no histórico e é mostrada à IA, para não ser repetida.

**Fase 1 (aceita, 19/11/2026): pela assinatura do Claude, via MCP**

- O servidor MCP da Prospecção ganha `get_bant` e `propose_bant_evidence` (US-0024). A pessoa,
  no Claude dela, pede o desk research ou a leitura das notas; a busca na web é a da própria
  assinatura; o Claude grava as propostas no Pulse com a sessão da pessoa (RLS).
- Sem chave de API, sem custo novo, sem dado saindo do Pulse além do que a pessoa já leva ao
  Claude que usa no trabalho.

**Fase 2 (proposta): dentro do Pulse, com chave de API**

- Botão "Fazer desk research" e reavaliação a cada nota ou registro novo, numa Edge Function
  que chama a API do Claude (modelo padrão Claude Opus 5.5, com a ferramenta de busca na web) e
  grava as mesmas propostas.
- Chave da organização no Console da Anthropic, só como segredo do Supabase; nunca no
  navegador nem em log.
- Custo estimado em tokens: na casa de US$ 0,15 a 0,40 por desk research com algumas buscas,
  mais a cobrança da busca na web; centavos por reavaliação de nota curta. Limite por mês a
  definir antes de ligar.
- Transcrições de reunião e e-mails entram só depois, com decisão própria (são o conteúdo mais
  sensível).

## Consequências

- Benefícios: qualificação mais rápida, com fonte em cada evidência e a decisão sempre humana;
  valida a qualidade das propostas antes de pagar por API.
- Custos: na fase 1, depende de a pessoa pedir ao Claude; na fase 2, custo por uso e uma Edge
  Function a manter.
- Riscos: IA confundir pessoas homônimas ou trazer notícia errada — mitigado pela fonte
  obrigatória e pelo aceite; dado pessoal além do profissional — mitigado pela regra acima e
  pela revisão de quem aceita.
- Como reverter: remover as duas ferramentas do MCP; as propostas já gravadas continuam no
  histórico (aceitas ou recusadas).

## Evidências

- Migration `20261119120000_qualificacao_e_bant` (tabela, trigger e RLS das evidências).
- US-0022, US-0023, US-0024; ferramentas em `apps/mcp-prospeccao/src/index.ts`.
