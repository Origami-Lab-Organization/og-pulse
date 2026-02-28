

# Minha Timesheet — Pagina Unificada

## Visao Geral

Remover o ToggleGroup (alternancia entre abas) e exibir ambas as secoes na mesma pagina, em sequencia vertical. A ordem sera:

1. **Lancar Horas** (secao principal, card com grid semanal)
2. **Minha Alocacao** (secao complementar, card com barra de progresso e tabela por projeto)

Essa abordagem e a mais adequada porque:
- O lancamento de horas e a acao primaria — deve estar no topo
- A alocacao funciona como contexto/feedback visual do progresso mensal
- Elimina fricao de troca de abas (clique extra para ver informacao complementar)
- Segue o padrao "acao primeiro, contexto depois" usado em produtos como Google Workspace e ferramentas de gestao de tempo

## Mudancas Visuais

```text
+--------------------------------------------------+
| Minha Timesheet          [Seletor de Semana]     |
+--------------------------------------------------+
| LANCAR HORAS (Card)                              |
| Projeto | Seg | Ter | Qua | Qui | Sex | Tot | St |
| Proj A  |  8  |  8  |  8  |  8  |  8  | 40  | x |
| Proj B  |  4  |  4  |  4  |  4  |  4  | 20  | x |
|--------------------------------------------------|
| Total da Semana: 60.0h          [Enviar (2)]    |
+--------------------------------------------------+
|                                                  |
| MINHA ALOCACAO (Card)                            |
| Capacidade mensal: 120h realizado de 176h        |
| [====Verde Escuro====][==Verde Claro==][  Cinza ]|
| Projeto   | Plan. | Real. | Progresso | %        |
| Proj A    | 80h   | 60h   | [======]  | 75%      |
| Proj B    | 40h   | 30h   | [====]    | 75%      |
+--------------------------------------------------+
```

## Detalhes Tecnicos

### Arquivo: `src/pages/MyTimesheet.tsx`

1. **Remover** o import e uso do `ToggleGroup` e `ToggleGroupItem`
2. **Remover** o estado `activeSection` e toda logica condicional de abas
3. **Remover** os icones `BarChart3` e `Clock` (usados apenas nos toggles)
4. **Reestruturar** o layout para renderizar ambas as secoes sempre:
   - Primeiro: o Card de lancamento de horas (bloco que hoje esta em `activeSection === 'timesheet'`)
   - Segundo: o componente `MyTimesheetAllocation` (que hoje esta em `activeSection === 'allocation'`)
5. O `TimesheetWeekSelector` permanece no topo, alinhado a direita, sem o ToggleGroup ao lado
6. Nenhuma mudanca em componentes filhos (`TimesheetWeekRow`, `MyTimesheetAllocation`, `SubmitAllProjectsDialog`)

