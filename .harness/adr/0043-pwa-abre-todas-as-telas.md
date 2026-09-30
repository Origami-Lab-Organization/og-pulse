# ADR 0043: O app instalado (PWA) abre todas as telas

- Status: aceito
- Data: 2026-09-29
- Decisores: Italo Castro
- Substitui em parte: ADR-0004, na restrição de rotas do modo standalone

## Contexto

O ADR-0004 limitou o app instalado no celular a Timesheet, Meu Kanban e Reembolsos. Qualquer
outra tela voltava para o Timesheet com o aviso "Esta funcionalidade está disponível apenas
no navegador", e o menu escondia as outras seções. Com a Prospecção operada também pelo
celular, o pedido de 29/09/2026 foi direto: **tudo tem que funcionar no celular**.

## Decisão

- O `PwaRouteGuard` deixa de bloquear rotas, e o menu do app instalado mostra as mesmas seções
  do navegador, com as mesmas capacidades.
- **O cache offline não muda.** O service worker (`src/sw.ts`) continua guardando só os `GET`s
  da allowlist original, com a chave presa ao `sub` do JWT, validade de 24 h e limpeza no
  logout. As outras telas funcionam online e nada delas é guardado no aparelho.
- O banner de instalação continua aparecendo só nas telas de uso diário (Timesheet e Kanban).

## Consequências

- **Benefícios:** o comercial trabalha a Prospecção, as Empresas e as Métricas pelo app
  instalado, sem trocar para o navegador.
- **Custos:** as telas largas (tabelas, quadro Kanban, Empresas) passam a ser usadas em
  tela pequena e precisam de revisão de layout para celular.
- **Riscos:** nenhum sobre dado. O que é guardado offline continua igual.
- **Como reverter:** voltar o `PwaRouteGuard` e o filtro do `AppNavbar` do commit desta
  mudança.
