

# Plano: Ajustes na Calculadora de Custos

## Alteracoes

1. **Remover validacao de salario minimo** - Calcular a partir de 3 digitos (>= 100) em vez de >= 1412
2. **Card 1 (Custo Empresa)**: Mostrar detalhamento completo (encargos e provisoes) sempre visivel, sem collapsible. Remover grid 2x2, usar formato de lista igual aos cards 2 e 3
3. **Card 2 (Salario Liquido)**: Remover o collapsible "Ver detalhamento dos descontos"
4. **Card 3 (Equivalente PJ)**: Remover o bloco de aviso "Importante"
5. **Alinhar totais**: Usar `mt-auto` nos cards para empurrar os totais para o fundo, alinhando visualmente as 3 colunas

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EmployeeCalculator.tsx` | Alterar threshold de 1412 para 100, remover mensagem de salario minimo |
| `src/components/calculator/CalculatorResults.tsx` | Reestruturar Card 1, remover collapsibles e aviso |

## Detalhes

### EmployeeCalculator.tsx

- Linha 43: `hasValidInput = salarioBrutoNum >= 1412` muda para `>= 100`
- Linhas 75-79: Remover bloco de aviso sobre salario minimo
- Linhas 96-97: Remover texto "(minimo R$ 1.412,00)" do placeholder

### CalculatorResults.tsx - Card 1

Substituir o grid 2x2 + collapsible por uma lista vertical com todos os itens visiveis:

```text
1. Custo para a Empresa (CLT)
  
  Base (Salario)                    R$ 5.000,00
  
  Encargos sobre Salario
    FGTS (8%)                       R$ 400,00
    INSS Patronal (20%)             R$ 1.000,00
    RAT (2%)                        R$ 100,00
    Terceiros (5,8%)                R$ 290,00
    Outros                          R$ 0,00
  
  Provisoes
    13o Salario (1/12)              R$ 416,67
    Ferias Base (1/12)              R$ 416,67
    1/3 de Ferias                   R$ 138,89
    Encargos s/ 13o                 R$ ...
    Encargos s/ Ferias              R$ ...
  
  Beneficios                        R$ 0,00
  
  ┌─────────────────────────────────────┐
  │ Custo Total Mensal    R$ 8.145,00   │  (fundo destacado)
  │ Custo/Hora            R$ 48,48/h    │
  └─────────────────────────────────────┘
```

### CalculatorResults.tsx - Card 2

Remover linhas 211-280 (Collapsible inteiro de detalhamento INSS/IRRF).

### CalculatorResults.tsx - Card 3

Remover linhas 352-365 (bloco "Importante" com AlertTriangle).

### Alinhamento dos Totais

Para alinhar os totais das 3 colunas na mesma altura:
- Cada Card recebe `className="flex flex-col"`
- O CardContent recebe `className="flex-1 flex flex-col"`
- O bloco de total de cada card recebe `className="mt-auto"` para empurrar para o fundo

## Notas Tecnicas

- Remover imports nao usados: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronDown`, `ChevronUp`, `AlertTriangle`, `Button`, `DEPENDENT_DEDUCTION`
- O estado `isOpenCost` e `isOpenNet` tambem podem ser removidos
- Manter a logica de calculo inalterada
