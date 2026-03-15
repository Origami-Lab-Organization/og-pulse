

## Avaliacao UX — Tela de Detalhe do Lead (apos criacao)

### Situacao Atual

Ao clicar em um lead recem-criado na Triagem, o gerente ve:

```text
┌─────────────────────────────────────────────┐
│ Nome do Lead          [Qualificacao →]  [⋮] │
│ ─────────────────────────────────────────── │
│ [Detalhes]  [Historico]                      │
│                                              │
│ OPORTUNIDADE                                 │
│  Nome da Oportunidade *  [disabled]          │
│  Tipo de Servico [disabled] Responsavel [dis]│
│  Valor Estimado [disabled]                   │
│  Observacoes [disabled]                      │
│ ─────────────────────────────────────────── │
│ EMPRESA              │ CONTATO               │
│  Empresa [disabled]  │  Nome [disabled]      │
│                      │  Email [dis] Tel [dis] │
│                      │  Origem [disabled]     │
└─────────────────────────────────────────────┘
```

### Problemas Identificados

1. **Tudo desabilitado num lead vazio** — O lead acabou de ser criado e o gerente precisa clicar ⋮ → Editar para preencher qualquer campo. Nao faz sentido exibir um formulario vazio e read-only.

2. **Sem indicador visual de progresso** — Nao ha nenhum stepper ou breadcrumb mostrando em qual etapa do funil o lead esta. O unico indicador e o texto minusculo "Qualificacao →" no header.

3. **Acao de avancar e quase invisivel** — O botao de avancar e um link de texto com 10px no canto do header, facil de ignorar. Deveria ser um CTA claro no footer.

4. **Layout desperdicado** — A secao Empresa/Contato ocupa metade do dialog mesmo quando vazia. Para um lead recem-criado, os campos prioritarios sao Servico e Responsavel.

5. **Modal bloqueia contexto** — Um dialog modal impede o gerente de ver o Kanban enquanto edita. Um Sheet (drawer lateral) preservaria o contexto.

6. **Tabs desnecessarias para lead novo** — O lead recem-criado nao tem historico. Mostrar a tab "Historico" como opcao principal adiciona ruido.

### Proposta de Redesign

```text
┌── Sheet (direita, 480px) ────────────────────┐
│                                               │
│  ● Triagem → ○ Qualificacao → ○ Proposta ... │
│                                               │
│  Nome do Lead                          [⋮]   │
│  Empresa: Acme Corp                           │
│                                               │
│ ─────────────────────────────────────────────│
│  QUALIFICACAO                                 │
│   Tipo de Servico     [select editavel]       │
│   Responsavel         [select editavel]       │
│   Valor Estimado      [input editavel]        │
│                                               │
│  CONTATO                                      │
│   Nome    [editavel]                          │
│   Email   [editavel]    Tel [editavel]        │
│   Origem  [select]                            │
│                                               │
│  OBSERVACOES                                  │
│   [textarea editavel]                         │
│                                               │
│  ▼ Historico (accordion, colapsado)           │
│                                               │
│ ─────────────────────────────────────────────│
│  [Arquivar]              [Avancar p/ Qualif.] │
└───────────────────────────────────────────────┘
```

### Alteracoes Tecnicas

| # | Alteracao | Arquivo |
|---|-----------|---------|
| 1 | Trocar `Dialog` por `Sheet` (side="right", w-[480px]) | `LeadDetailDialog.tsx` |
| 2 | Adicionar stepper horizontal mostrando a etapa atual do funil | `LeadDetailDialog.tsx` (novo componente inline) |
| 3 | Auto-editar: `isEditing = true` quando lead esta em screening/qualification | `LeadDetailDialog.tsx` L139 |
| 4 | Mover botao de avancar para o footer como Button primario | `LeadDetailDialog.tsx` — footer sempre visivel |
| 5 | Substituir Tabs por Accordion colapsavel para Historico | `LeadDetailDialog.tsx` — remover Tabs, usar Collapsible |
| 6 | Reorganizar campos: priorizar Servico e Responsavel no topo, agrupar Contato abaixo | `LeadDetailDialog.tsx` — reordenar JSX |
| 7 | Exibir info do cliente (nome da empresa) como texto no header, nao como campo de formulario read-only | `LeadDetailDialog.tsx` |

