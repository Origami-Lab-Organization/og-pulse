# GP-J8 — Negócio Fechado (wizard + celebração)

> Jornada: GP Comercial J8 · Estado auditado: 🟡 PARCIAL (~80%)
> Dependências externas: nenhuma para esta task. **Interna:** GP-J9 (Anexo de Contrato) é o step pós-celebração deste fluxo — ver `Notas Técnicas`.

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Wizard de 3 seções em `CloseBusinessDialog.tsx` (`src/components/crm/CloseBusinessDialog.tsx`):
  - Seção 1 — Definição do projeto: nome (pré-preenchido da oportunidade), GP responsável, datas de início/término; validação Zod.
  - Seção 2 — Condições financeiras adaptáveis por `projectType` (contrato/recorrência/taxa de sucesso), com tabela de parcelas editável no modelo Contrato.
  - Seção 3 — Revisão: resumo completo + valor total em destaque.
- `useCloseBusinessDeal.ts` (`src/hooks/useCloseBusinessDeal.ts`): cria projeto no portfólio em estágio "planning", copia suppliers/materials/roles, suporta modo no-budget; toast de sucesso.

**❌ Pendente:**
- Botão **"Distribuir igualmente"** na tabela de parcelas (modelo Contrato).
- **Celebração/confetti** na confirmação com mensagem "🎉 [Cliente] fechado! R$ [valor]".

## História de Usuário

**Como** GP Comercial fechando um negócio,
**quero** distribuir as parcelas igualmente com um clique e viver uma celebração visual ao confirmar,
**para que** a montagem do cronograma seja rápida e o fechamento seja um momento memorável, não burocrático.

## Contexto

Jornada J8 F2/F3. O fluxo já funciona end-to-end (wizard cria o projeto). Faltam apenas dois ganhos de UX descritos na jornada: o atalho "Distribuir igualmente" no modelo Contrato e o momento de celebração ao confirmar. Esta task absorve e expande o quick-win GP-J8-CELEBRATE para a jornada J8 inteira. O anexo de contrato (J9) é tratado como task separada e encadeada após a celebração.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-A1 — Distribuir igualmente (modelo Contrato)**
- Na tabela de parcelas, botão "Distribuir igualmente" divide o valor total pelo número de parcelas.
- Trata sobra de centavos: a última parcela absorve o arredondamento; soma das parcelas = total exato.
- Disponível apenas em modelos com parcelas (Contrato/escopo fixo); ausente em Equity/sem cronograma.
- Não sobrescreve valores se o usuário editar manualmente depois; só atua no clique.

**CA-A2 — Celebração na confirmação**
- Ao confirmar com sucesso (`useCloseBusinessDeal` retorna ok): animação de celebração (confetti) + mensagem "🎉 [Nome do Cliente] fechado! R$ [valor total]".
- A celebração é feedback pós-sucesso; o projeto já foi criado e a celebração não bloqueia o fluxo.

**CA-A3 — Falha não celebra**
- Se `useCloseBusinessDeal` falhar (ex: erro de banco): sem animação; mensagem de erro clara; dados do formulário preservados (não fechar o dialog nem limpar campos).

### Parte B — Melhorias no existente (depois)

**CA-B1 — Visualização financeira por modelo na Seção 2**
- Recorrência: visualização dos próximos 3 meses de cobrança a partir da primeira data.
- Taxa de Sucesso: exibir data prevista de apuração, % e valor base estimado de forma legível.
- Equity/sem cronograma: seção financeira adapta sem tabela de parcelas; celebração ainda ocorre no sucesso.

**CA-B2 — Valor total único como fonte de verdade**
- O valor total exibido na Seção 3 e usado na mensagem de celebração reutiliza o mesmo cálculo do resumo do dialog (sem recalcular em paralelo).

## Fora do Escopo

- Step de anexo de contrato pós-celebração → **GP-J9** (task encadeada).
- Som/áudio de celebração.
- Criação inline de usuário para GP responsável sem conta (cenário-limite — avaliar depois).
- Renomeação CRM→Comercial / Lead→Oportunidade (GP-J2).

## Notas Técnicas

- Componente: `src/components/crm/CloseBusinessDialog.tsx`; hook: `src/hooks/useCloseBusinessDeal.ts`.
- Confetti: avaliar `canvas-confetti` (lib leve). Adicionar dependência nova exige ADR (boundary: não incluir/trocar lib sem decisão registrada em `.harness/adr/`).
- "Distribuir igualmente" é puro cálculo de UI sobre o estado das parcelas; não persiste nada até o submit do wizard.
- Multi-tenant: a criação de projeto já passa por `useCloseBusinessDeal`; manter `tenant_id`/RLS herdados da oportunidade de origem (não introduzir novo acesso a dados nesta task).
- **Encadeamento com GP-J9:** após CA-A2, o fluxo deve permitir continuar para o step de upload de contrato (J9) sem fechar o dialog abruptamente. Expor um ponto de extensão (ex: callback `onClosed(projectId)` ou estado "celebrated") para J9 montar o step opcional. Não implementar o upload aqui.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Contrato 6 parcelas + "Distribuir igualmente" | Parcelas iguais; soma = total exato (centavos no último valor) |
| Editar uma parcela após distribuir | Valor manual preservado; sem redistribuição automática |
| Confirmar com sucesso | Confetti + "🎉 [Cliente] fechado! R$ [valor]"; projeto criado em "Planejamento" |
| Erro no fechamento | Sem celebração; erro claro; formulário e campos preservados |
| Modelo Equity | Sem tabela de parcelas nem "Distribuir igualmente"; celebração no sucesso |
| Recorrência | Próximos 3 meses de cobrança visíveis na Seção 2 |
| Pós-celebração (com J9 ativo) | Fluxo permite avançar ao step de anexo de contrato sem refazer o fechamento |
