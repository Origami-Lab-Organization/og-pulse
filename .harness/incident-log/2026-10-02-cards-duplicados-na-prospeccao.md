# Cards duplicados na Prospecção — 02/10/2026

## Sintoma

A mesma pessoa aparecia duas vezes no quadro da Prospecção, em etapas diferentes. Exemplo
relatado pelo Guilherme: "Augusto · Distrimed", com o mesmo responsável, em **Respondeu** e
em **Reunião feita**. Ninguém tinha criado o segundo card de propósito.

## Causa

A migração que trouxe as Oportunidades para a Prospecção (`20260929120000`, ADR-0040) só
devolvia a oportunidade ao contato de origem quando havia **vínculo explícito**:
`leads.prospect_id` ou `prospects.converted_lead_id`. Esse vínculo só existia quando alguém
convertia o card da Prospecção em oportunidade pelo botão.

Oportunidade cadastrada à mão no Pipeline antigo, para alguém que já estava na Prospecção,
não tinha vínculo. Virou contato **novo**, na mesma empresa (reaproveitada por cliente, CNPJ
ou nome) e com o mesmo nome. A etapa veio do de-para (`screening → respondeu`,
`qualification → reuniao_feita`), e daí as duas colunas diferentes.

A união de contatos de 01/10 (`20261001190000`, ADR-0045) não corrigiu porque só une pessoas
pelo mesmo e-mail ou LinkedIn, e esses cards em geral não tinham nenhum dos dois. E "um card
em andamento por pessoa" só era garantido pela tela, não pelo banco.

## Correção

Migration `20261002120000_prospect_une_cards_duplicados`:

- une como duplicata **por erro** só dois casos:
  - card nascido da migração (`legado_oportunidades.de_para`, `contato_existente = false`) e
    card que já existia, na mesma empresa e com o mesmo nome (sem caixa, espaço nem acento),
    com pelo menos um dos dois em andamento;
  - dois cards em andamento da mesma pessoa (`contact_id`).
- Cards encerrados da mesma pessoa são histórico legítimo e não são tocados.
- Fica o card mais avançado. Atividades (renumeradas pela data), tarefas, histórico de etapa,
  orçamento, projeto, vínculo de sócio, alavanca, valor e observações passam para ele.
- Grupo com dois orçamentos não é unido: aparece no NOTICE para decisão manual.
- Tudo o que muda fica em `legado_contatos.uniao_*`, com rollback.
- O banco passa a recusar um segundo card em andamento para a mesma pessoa (trigger
  `prospects_um_card_aberto` e índice único parcial `prospects_um_card_aberto_key`).

Ensaiado num Postgres local (PGlite) com os casos do relato, mais e-mail repetido, Perda
duplicada, homônimo sem gêmeo, dois orçamentos e rollback: 29 verificações sem falha.

## Lição

Migração que funde dois cadastros precisa deduplicar pelo que identifica a coisa, não só pelo
vínculo que o sistema antigo deveria ter gravado. Vínculo ausente é exatamente o caso em que
o time fez o processo por fora. E regra de unicidade que só a tela garante não vale para dado
migrado.
