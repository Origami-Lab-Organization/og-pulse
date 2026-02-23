

## Simplificar Alocacao de Equipe para Projetos de Financiamento da Inovacao

### Contexto

Projetos de "Financiamento da Inovacao" nao possuem orcamento associado, portanto o modelo atual de "adicionar papel > atribuir funcionario" nao faz sentido. Para esses projetos, a alocacao deve ser simplificada: escolher diretamente o funcionario e definir horas por mes dentro do ano corrente.

### O que muda

**Modelo atual (projetos normais):**
- Adicionar Papel (role, senioridade, valor/hora)
- Opcionalmente herdar do orcamento
- Atribuir funcionario ao papel
- Definir horas por mes ao longo da duracao do projeto

**Modelo simplificado (financiamento da inovacao):**
- Selecionar funcionario diretamente
- Definir horas por mes (meses dentro do ano corrente, ex: Jan-Dez)
- Sem campo de papel, senioridade ou valor/hora
- Sem referencia ao orcamento

### Etapas Tecnicas

**1. Passar `serviceLine` para o `ProjectLaborSection`**

Modificar `ProjectCostsTab.tsx` para passar `serviceLine={project.service_line}` como nova prop ao `ProjectLaborSection`.

**2. Adaptar `ProjectLaborSection.tsx`**

Receber nova prop `serviceLine?: string | null`.

Quando `serviceLine === 'financiamento_inovacao'`:

- **Botao de adicionar**: trocar label de "Adicionar Papel" para "Adicionar Membro"
- **Dialog de adicionar**: modo simplificado
  - Exibir apenas select de funcionario (direto, sem campo de papel/senioridade/valor hora)
  - Ao selecionar funcionario, preencher `role` automaticamente com o cargo do funcionario
  - Sem checkbox de "herdar do orcamento"
- **Colunas da tabela**: ocultar coluna "R$/h" (nao ha valor/hora orçado)
- **Meses**: usar meses do ano corrente (Jan a Dez ou conforme o periodo do projeto) em vez de "Mes 1, Mes 2..."
- **Dialog de edicao**: ocultar campos de senioridade e valor/hora

Quando nao for financiamento: comportamento atual 100% mantido.

**3. Adaptar `ProjectTeamSection.tsx` (visao geral)**

Quando for financiamento, ocultar referencia a senioridade no tooltip.

### Arquivos modificados

- `src/components/projects/detail/ProjectCostsTab.tsx` - passar `serviceLine` para `ProjectLaborSection`
- `src/components/projects/detail/ProjectLaborSection.tsx` - logica condicional para modo simplificado
- `src/components/projects/detail/ProjectTeamSection.tsx` - ajuste menor no tooltip

### Detalhes de implementacao

**Dialog simplificado (financiamento):**
```
[Select: Funcionario]  -->  auto-preenche role com cargo
[Confirmar]
```

**Colunas da tabela (financiamento):**
```
Funcionario | Jan | Fev | Mar | ... | Dez | Horas | Custo | Acoes
```

**Colunas da tabela (normal - sem mudanca):**
```
Funcionario | R$/h | Mes 1 | Mes 2 | ... | Horas | Custo | Acoes
```

O campo `role` continua sendo preenchido (com o cargo do funcionario), mantendo compatibilidade com o banco de dados que exige esse campo. O `seniority` sera preenchido com valor padrao 'pleno' e `hourly_rate` com 0.
