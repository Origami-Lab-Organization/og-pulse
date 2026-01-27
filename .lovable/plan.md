
# Plano: Ajustes no Wizard de Cadastro de Funcionario

## Resumo das Mudancas

1. Remover botao "Cancelar" e adicionar confirmacao ao clicar no X
2. Remover campo INSS (ja incluido na DAS do Simples Nacional)
3. Unificar as secoes Valores, Encargos, Provisoes e Resumo em uma unica secao

---

## 1. Remover Botao Cancelar e Adicionar Confirmacao no X

### Situacao Atual
- Existe um botao "Cancelar" no footer do dialog (linhas 1067-1074)
- O X no topo do dialog fecha sem confirmacao

### Mudanca
- Remover o botao "Cancelar"
- Interceptar o fechamento do dialog (onOpenChange)
- Exibir AlertDialog de confirmacao perguntando se deseja sair
- So fechar se o usuario confirmar

### Implementacao

Adicionar estado e componente AlertDialog:
```typescript
const [showExitConfirm, setShowExitConfirm] = useState(false);

const handleClose = (open: boolean) => {
  if (!open) {
    // User is trying to close - show confirmation
    setShowExitConfirm(true);
  } else {
    onOpenChange(open);
  }
};

const confirmExit = () => {
  setShowExitConfirm(false);
  onOpenChange(false);
};
```

Adicionar AlertDialog de confirmacao:
```tsx
<AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
      <AlertDialogDescription>
        Os dados preenchidos serao perdidos. Tem certeza que deseja sair?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Continuar editando</AlertDialogCancel>
      <AlertDialogAction onClick={confirmExit}>
        Sair sem salvar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Remover botao Cancelar (linhas 1067-1074):
```tsx
// REMOVER:
<Button
  type="button"
  variant="outline"
  onClick={() => onOpenChange(false)}
  disabled={isLoading}
>
  Cancelar
</Button>
```

---

## 2. Remover Campo INSS Empresa

### Justificativa
No Simples Nacional, o INSS Patronal ja esta incluido no DAS (recolhimento unificado). O campo mostra R$ 0,00 e e confuso para o usuario.

### Mudanca
- Remover campo "INSS Empresa" do card de Encargos (linhas 846-858)
- Remover estado `inssDisplay` e referencias
- Manter a logica de calculo no backend (para futura flexibilidade com outros regimes)
- Manter o campo no schema (para persistencia), apenas nao exibir na UI

### Antes (linhas 846-858):
```tsx
{/* INSS Empresa - CLT, Menor Aprendiz, Sócio */}
{showCharges && (
  <FormItem>
    <FormLabel>INSS Empresa</FormLabel>
    <FormControl>
      <Input 
        disabled
        value={inssDisplay}
        className="bg-muted"
      />
    </FormControl>
  </FormItem>
)}
```

### Depois:
Remover completamente este bloco da UI.

---

## 3. Unificar Secoes Valores, Encargos, Provisoes e Resumo

### Situacao Atual
Na Etapa 2 (renderFinancialFields) existem:
- Card "Valores" (linhas 704-817)
- Card "Encargos e Provisoes" (linhas 819-902)
- Card "Resumo de Custo" (linhas 602-647)

### Nova Estrutura
Unificar tudo em um unico card chamado "Dados da Contratacao" com subsecoes internas usando Separator:

```text
+--------------------------------------------------+
| Dados da Contratacao                             |
+--------------------------------------------------+
| Tipo de Contratacao [dropdown]                   |
| Jornada Mensal (horas) [input]                   |
+--------------------------------------------------+
| VALORES                                          |
| Salario Bruto (ou campo dinamico) [input]        |
+--------------------------------------------------+
| ENCARGOS (calculados automaticamente)            |
| FGTS                         R$ X.XXX,XX         |
| 13o Salario                  R$ X.XXX,XX         |
| Ferias + 1/3                 R$ X.XXX,XX         |
+--------------------------------------------------+
| RESUMO                                           |
| Base                         R$ X.XXX,XX         |
| Encargos                     R$ X.XXX,XX         |
| Provisoes                    R$ X.XXX,XX         |
| ----------------------------------------         |
| SUBTOTAL SALARIAL           R$ XX.XXX,XX         |
+--------------------------------------------------+
| (!) Calculo estimado; valide com contabilidade   |
+--------------------------------------------------+
```

### Implementacao

Refatorar `renderFinancialFields()` para:

```tsx
const renderFinancialFields = () => {
  const showCharges = showsChargesSection(tipoContratacao as ContractType);
  const showProvisions = showsProvisionsSection(tipoContratacao as ContractType);
  const baseLabel = getBaseFieldLabel(tipoContratacao as ContractType);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Dados da Contratacao</CardTitle>
        <CardDescription>
          Configure o tipo de vinculo e valores do funcionario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo e Jornada */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tipo de Contratacao */}
          <FormField ... />
          {/* Jornada Mensal */}
          <FormField ... />
        </div>
        
        <Separator />
        
        {/* Valores - Dinamico por tipo */}
        <div>
          <h4 className="text-sm font-medium mb-3">Valores</h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Campos dinamicos conforme tipoContratacao */}
          </div>
        </div>
        
        {/* Encargos - Se aplicavel */}
        {(showCharges || showProvisions) && tipoContratacao !== 'PJ' && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">
                {tipoContratacao === 'ESTAGIO' ? 'Provisoes' : 'Encargos e Provisoes'}
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Calculados automaticamente
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* FGTS */}
                {showCharges && (
                  <FormItem>
                    <FormLabel>FGTS</FormLabel>
                    <Input disabled value={fgtsDisplay} className="bg-muted" />
                  </FormItem>
                )}
                {/* 13o / Provisao Recesso */}
                {showProvisions && (
                  <FormItem>
                    <FormLabel>
                      {tipoContratacao === 'ESTAGIO' ? 'Provisao Recesso' : '13o Salario'}
                    </FormLabel>
                    <Input disabled value={decimoDisplay} className="bg-muted" />
                  </FormItem>
                )}
                {/* Ferias */}
                {showProvisions && tipoContratacao !== 'ESTAGIO' && tipoContratacao !== 'SOCIO' && (
                  <FormItem>
                    <FormLabel>Ferias + 1/3</FormLabel>
                    <Input disabled value={feriasDisplay} className="bg-muted" />
                  </FormItem>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* PJ - Mensagem */}
        {tipoContratacao === 'PJ' && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Para contratos PJ, nao ha encargos trabalhistas ou provisoes.
            </p>
          </>
        )}
        
        {/* Resumo Integrado */}
        {costBreakdown && (
          <>
            <Separator />
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Resumo de Custo
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Base</span>
                <span className="text-right font-medium">
                  {formatCurrency(costBreakdown.baseAmount)}
                </span>
                <span className="text-muted-foreground">Encargos</span>
                <span className="text-right font-medium">
                  {formatCurrency(costBreakdown.chargesAmount)}
                </span>
                <span className="text-muted-foreground">Provisoes</span>
                <span className="text-right font-medium">
                  {formatCurrency(costBreakdown.provisionsAmount)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>SUBTOTAL SALARIAL</span>
                <span className="text-primary">
                  {formatCurrency(
                    costBreakdown.baseAmount + 
                    costBreakdown.chargesAmount + 
                    costBreakdown.provisionsAmount
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Beneficios e ferramentas serao adicionados nas etapas seguintes.
              </p>
            </div>
          </>
        )}
        
        {/* Aviso */}
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-warning-foreground">
            Calculo estimado; valide com contabilidade.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Arquivos a Modificar

**`src/components/employees/EmployeeFormDialog.tsx`**
- Adicionar imports: `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- Adicionar estado `showExitConfirm`
- Adicionar funcao `handleClose` e `confirmExit`
- Alterar Dialog para usar `handleClose` em vez de `onOpenChange`
- Remover botao "Cancelar" do footer
- Adicionar componente AlertDialog de confirmacao
- Remover campo INSS Empresa da UI
- Remover estado `inssDisplay` e referencias
- Refatorar `renderFinancialFields()` para unificar os cards
- Remover funcao `renderCostSummaryCard()` (integrada no card unico)

---

## Resumo das Alteracoes

| Item                           | Acao                                      |
|--------------------------------|-------------------------------------------|
| Botao Cancelar                 | Remover                                   |
| Clique no X                    | Adicionar confirmacao via AlertDialog     |
| Campo INSS Empresa             | Remover da UI (manter na logica)          |
| Card Valores                   | Integrar em card unico                    |
| Card Encargos/Provisoes        | Integrar em card unico                    |
| Card Resumo                    | Integrar em card unico                    |
| Novo card                      | "Dados da Contratacao" (unico)            |

---

## Criterios de Aceite

1. Nao existe mais botao "Cancelar" no wizard
2. Ao clicar no X, aparece dialog de confirmacao "Deseja sair?"
3. Usuario pode escolher "Continuar editando" ou "Sair sem salvar"
4. Campo INSS Empresa nao aparece mais na interface
5. Etapa 2 exibe apenas 1 card unificado com todas as informacoes
6. Layout compacto com Separators entre secoes
7. Resumo de custo integrado no mesmo card
