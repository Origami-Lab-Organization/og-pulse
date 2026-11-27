# US-0012 — Classificar pelo teclado

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 4
- **Aprovada por / em:** —
- **Relacionadas:** US-0008, US-0010

## Descrição

**Como** pessoa do comercial,
**quero** navegar e classificar a lista pelo teclado,
**para** avaliar dezenas de empresas sem tirar a mão do teclado.

### Escopo

- Inclui: J e K (ou setas) movem a linha atual; Enter abre a ficha; A abre
  oportunidade; N marca "Não agora"; D abre o descarte com motivo; legenda dos atalhos
  no rodapé da tabela.
- Não inclui: atalhos fora desta tela.

## Critérios de aceite

**Cenário 1: navegar**

- **Quando** aperto J ou seta para baixo;
- **Então** a linha seguinte fica destacada e visível.

**Cenário 2: classificar**

- **Dado** uma linha destacada em "A classificar";
- **Quando** aperto A, N ou D;
- **Então** acontece o mesmo que o botão correspondente.

**Cenário 3: digitando**

- **Dado** que o cursor está num campo de texto ou na ficha aberta;
- **Então** os atalhos não disparam.

## Contexto técnico

- **Restrições e padrões aplicáveis:** foco visível e acessibilidade — fonte:
  `../../../patterns/design-system.md`.
- **Provas esperadas:** teste dos atalhos e do bloqueio em campo de texto.
- **Fora do escopo:** atalhos configuráveis.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
