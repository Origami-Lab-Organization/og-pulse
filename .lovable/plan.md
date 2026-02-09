
# Mover Calculadora para Dentro da Tela de Funcionarios

## Resumo

Remover a calculadora do menu lateral e da rota separada `/calculator`, e adiciona-la como um Dialog (modal) acessivel por um botao discreto com icone de calculadora na tela de funcionarios.

## Mudancas

### 1. Remover do menu lateral
**Arquivo**: `src/components/layout/AppSidebar.tsx`
- Remover o item `{ title: 'Calculadora', url: '/calculator', icon: Calculator }` do array de navegacao
- Remover o import de `Calculator` se nao for mais usado

### 2. Remover a rota `/calculator`
**Arquivo**: `src/App.tsx`
- Remover a rota `/calculator` e o import de `EmployeeCalculator`

### 3. Criar Dialog da Calculadora
**Arquivo**: `src/components/employees/EmployeeCalculatorDialog.tsx` (novo)
- Criar um Dialog que encapsula o conteudo da calculadora (inputs + results)
- Reutilizar os componentes `CalculatorInputs` e `CalculatorResults` ja existentes
- O Dialog tera titulo "Calculadora de Custos" e tamanho largo (`max-w-5xl`)

### 4. Adicionar botao de calculadora na tela de Funcionarios
**Arquivo**: `src/pages/Index.tsx`
- Importar o novo `EmployeeCalculatorDialog`
- Adicionar estado `calculatorOpen`
- Na area de `actions` (ao lado do botao "Adicionar Funcionario"), incluir um botao `variant="outline" size="icon"` com o icone `Calculator` e um Tooltip "Calculadora de Custos"
- Renderizar o `EmployeeCalculatorDialog` controlado pelo estado

### 5. Manter a pagina `EmployeeCalculator.tsx`
- O arquivo pode ser mantido ou removido. Como o conteudo sera reutilizado no Dialog, ele pode ser removido para limpeza, mas nao e obrigatorio.

## Resultado

O usuario vera um pequeno botao com icone de calculadora ao lado do botao "Adicionar Funcionario". Ao clicar, abre um modal com a calculadora completa de custos CLT vs PJ.
