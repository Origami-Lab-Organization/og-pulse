
# Bloquear avanco de KRs na fase de Planejamento

## Contexto

O projeto ja possui a logica de `portfolio_stage` para distinguir Planejamento de Execucao. Na fase de planejamento, o usuario pode criar OKRs e KRs (definir descricao, meta e unidade), mas nao deve poder alterar o **valor atual** nem o **nivel de confianca** — esses campos so serao editaveis a partir do estagio "Entrega de Valor".

## Mudancas

| Arquivo | Acao |
|---------|------|
| `src/components/projects/detail/ProjectOKRsTab.tsx` | Passar prop `isPlanning` para o `KeyResultFormDialog` |
| `src/components/projects/okrs/KeyResultFormDialog.tsx` | Receber `isPlanning` e desabilitar/ocultar os campos "Valor Atual" e "Nivel de Confianca" quando `true` |

### Detalhes

**ProjectOKRsTab.tsx**
- Calcular `isPlanning = project.portfolio_stage === 'planning'`
- Passar `isPlanning` como prop para `KeyResultFormDialog`

**KeyResultFormDialog.tsx**
- Adicionar prop `isPlanning?: boolean`
- Campo "Valor Atual" (`currentValue`): ja aparece so na edicao; quando `isPlanning === true`, esconder o campo mesmo na edicao
- Campo "Nivel de Confianca" (`confidenceLevel`): quando `isPlanning === true`, desabilitar o dropdown (manter o valor default "Medio" na criacao e o valor atual na edicao, sem permitir alteracao)
- Isso impede que o usuario registre progresso ou mude a confianca antes do projeto entrar em execucao
