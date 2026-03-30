

## Plano de Correção da Página de Alocação — P0, P1 e P2

---

### P0 — Bugs e problemas críticos de usabilidade

**P0.1 — Heatmap com faixas confusas e inconsistentes**

O heatmap atual tem uma faixa "amarela" de apenas 1% (90-91%), o que na prática nunca aparece. Abaixo de 90% e acima de 100% são ambos vermelhos, sem distinção.

- Corrigir `getMonthlyHeatmapMeta()` para usar faixas claras:
  - `> 100%` → vermelho (sobrealocado)
  - `91–100%` → verde (adequado)
  - `80–90%` → amarelo (atenção)
  - `1–79%` → laranja/âmbar (subalocado)
  - `0%` → cinza (ocioso)
- Adicionar uma legenda compacta abaixo do header da tabela mostrando as faixas de cor

**P0.2 — Sem indicador visual do mês corrente**

Ao olhar 12 colunas iguais é impossível saber "onde estamos". 

- Destacar a coluna do mês atual com `border-b-2 border-primary` no header e um fundo sutil `bg-primary/5` nas células desse mês

**P0.3 — Sem feedback de scroll horizontal**

A tabela tem 17+ colunas mas nenhuma indicação visual de que há mais conteúdo à direita.

- Fixar as colunas "Pessoa" e "Cargo" à esquerda (`sticky left-0`) com sombra lateral
- Fixar "Status" à direita (`sticky right-0`) com sombra

---

### P1 — UX de edição inline para PM/Admin

**P1.1 — Refatorar `AllocationOverview.tsx` (1382 linhas)**

Extrair para componentes menores seguindo o padrão do projeto:

| Novo arquivo | Responsabilidade |
|---|---|
| `AllocationEmployeeRow.tsx` | Linha principal do funcionário (heatmap + status) |
| `AllocationExpandedPanel.tsx` | Painel expandido com tabela de itens + botões |
| `AllocationEditableCell.tsx` | Célula editável inline (input/display) |
| `AllocationHeatmapLegend.tsx` | Legenda das faixas de cor |
| `useAllocationPlanner.ts` | Hook com query, filtros e lógica de draft/save (extrair de dentro do componente) |

O `AllocationOverview.tsx` ficará como orquestrador fino (~200 linhas).

**P1.2 — Affordance de edição nas células**

Atualmente, as células editáveis não se distinguem visualmente das não editáveis até o clique.

- Adicionar ícone `Pencil` (8px, `text-muted-foreground`) no canto da célula editável em hover
- Células não-editáveis (mês fora do range do projeto) mantêm o visual `border-dashed` atual
- Cursor `pointer` nas editáveis, `default` nas não-editáveis

**P1.3 — Navegação por Tab entre células**

- Ao pressionar `Tab` no input de edição, em vez de sair do fluxo, mover o foco para a próxima célula editável na mesma linha
- `Shift+Tab` para voltar
- Implementar via `onKeyDown` no `AllocationEditableCell`

**P1.4 — Sticky footer com resumo de alterações**

- Mover os botões "Cancelar" e "Salvar" para um `div` sticky no bottom do painel expandido
- Incluir um resumo: `"3 alterações pendentes · +24h planejadas"` mostrando o delta total

---

### P2 — Polimento visual e consistência com o sistema

**P2.1 — KPI cards no topo da página**

Seguindo o padrão do Portfolio (`PortfolioKPIBar`) e Analytics:

- 4 cards: **Total de pessoas** | **Adequados** (%) | **Sobrealocados** | **Subalocados/Ociosos**
- Usar `Card` do shadcn com ícones Lucide e cores consistentes com os badges de status

**P2.2 — Tooltip rico nas células do heatmap**

Substituir o `title` nativo por um `Tooltip` do shadcn com layout estruturado:

```text
┌──────────────────────────┐
│  Março 2026              │
│  Planejado: 120h         │
│  Realizado: 98h          │
│  Capacidade: 160h        │
│  Utilização: 75% (Plan)  │
└──────────────────────────┘
```

**P2.3 — Dialog de confirmação ao salvar com reason_code**

Alinhado com a nova tabela `timesheet_edit_logs` + `activity_timesheet_edit_logs`:

- Ao clicar "Salvar", abrir um `Dialog` mostrando lista de alterações (de → para)
- Campo `Select` para `reason_code` (obrigatório): "Item incorreto", "Horas incorretas", "Correção pós-aprovação", "Pedido do colaborador", "Outro"
- Campo `Textarea` para justificativa (obrigatório)
- Gravar os logs de auditoria junto com o upsert

**P2.4 — Badge de escopo (Admin vs Gerente)**

Seguindo o padrão do Portfolio:
- Admin vê "Visão da empresa" com ícone `Building2`
- Gerente vê "Meus projetos" com ícone `User`
- Posicionar no `actions` do `AppLayout`

---

### Resumo de arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/hooks/useAllocationPlanner.ts` | Criar — extrair query + lógica de draft |
| `src/components/timesheets/AllocationEmployeeRow.tsx` | Criar |
| `src/components/timesheets/AllocationExpandedPanel.tsx` | Criar |
| `src/components/timesheets/AllocationEditableCell.tsx` | Criar |
| `src/components/timesheets/AllocationHeatmapLegend.tsx` | Criar |
| `src/components/timesheets/AllocationKPIBar.tsx` | Criar |
| `src/components/timesheets/AllocationSaveDialog.tsx` | Criar |
| `src/components/timesheets/AllocationOverview.tsx` | Refatorar para orquestrador fino |
| `src/pages/Timesheets.tsx` | Adicionar KPI bar + badge de escopo |

### Ordem de execução sugerida

1. **P0.1 + P0.2 + P0.3** — Correções rápidas no arquivo atual (sem refatoração)
2. **P1.1** — Refatoração em componentes (pré-requisito para P1.2-P1.4)
3. **P1.2 + P1.3 + P1.4** — Melhorias de UX de edição
4. **P2.1 + P2.4** — KPIs e badge
5. **P2.2** — Tooltips ricos
6. **P2.3** — Dialog de confirmação com auditoria

