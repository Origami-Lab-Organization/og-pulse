

# Ajustes na Tela de Projetos

## 1. Card "Parcelas Atrasadas" - mostrar valor recebido e valor em atraso

O card ja calcula `receivedValue` e `overdueInstallments`. Vamos alterar para:
- **Valor principal**: exibir o valor recebido formatado (ex: `R$ 50.000`)
- **Texto menor**: informar se ha valor em atraso (ex: `R$ 10.000 em atraso` ou `Nenhum atraso`)
- **Titulo**: renomear para "Recebido no Ano"

**Arquivo**: `src/components/projects/ProjectStats.tsx`
- Calcular `overdueValue` (soma dos valores das parcelas atrasadas)
- Alterar o stat de "Parcelas Atrasadas":
  - `title`: "Recebido no Ano"
  - `value`: `formatCurrency(receivedValue)`
  - `description`: se `overdueValue > 0`, mostrar `"R$ X em atraso"`, senao `"Nenhum atraso"`
  - `variant`: destructive se `overdueValue > 0`

## 2. Badge de status em uma unica linha

O texto "Em Planejamento" e "Em Andamento" sao longos e quebram em duas linhas dentro da badge.

**Arquivo**: `src/components/projects/ProjectsTable.tsx`
- Adicionar `whitespace-nowrap` na classe da Badge de status (linha 83)

## 3. Remover descricao do projeto na tabela

A coluna "Projeto" mostra nome + descricao. Vamos remover a descricao.

**Arquivo**: `src/components/projects/ProjectsTable.tsx`
- Remover o bloco condicional `{project.description && (...)}` (linhas 43-47)
- Simplificar o cell para retornar apenas `<span className="font-medium">{project.name}</span>`

