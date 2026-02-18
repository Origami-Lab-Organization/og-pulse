
# Reorganizar campos do formulario de projeto

## O que muda

Reordenar os campos na aba "Dados Basicos" do formulario de projeto para que:

1. O checkbox "Projeto Continuo" venha **antes** das datas
2. As datas fiquem lado a lado em um grid de 2 colunas:
   - Se **continuo**: Data de Inicio + Data de Renovacao
   - Se **nao continuo**: Data de Inicio + Data de Fim (como ja funciona)
3. O helper text da Data de Renovacao fica abaixo do grid

## Layout resultante

```text
[Cliente]              [Gerente]
[x] Projeto Continuo
[Data de Inicio]       [Data de Renovacao *]   <-- se continuo
  "Data de renovacao automatica do contrato..."
[Data de Inicio]       [Data de Fim *]         <-- se nao continuo
[Status]
```

## Detalhes tecnicos

### Arquivo: `src/components/projects/ProjectFormDialog.tsx`

Trocar a ordem dos blocos na TabsContent "basic" (linhas ~274-344):

1. Mover o `FormField` do `isContinuous` (checkbox) para **antes** do grid de datas
2. No grid de datas (`grid grid-cols-2 gap-4`):
   - Coluna 1: sempre `startDate`
   - Coluna 2: se `isContinuous` mostra `renewalDate`, senao mostra `endDate`
3. Se `isContinuous`, adicionar o texto explicativo abaixo do grid (fora do grid)
4. Remover o bloco standalone de `renewalDate` que esta apos o checkbox (linhas 327-344)
