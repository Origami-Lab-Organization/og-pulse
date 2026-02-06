
# Plano: Meta de Margem Bruta nas Configurações Financeiras

## Resumo

Adicionar o campo "Meta de Margem Bruta" nas configurações financeiras. Esse valor (ex: 32%) será usado nos indicadores financeiros do projeto para ajudar no planejamento e execução.

---

## Alterações Necessárias

### 1. Banco de Dados

Renomear o campo existente `net_margin_percent` para `gross_margin_target_percent` (ou adicionar novo campo):

```sql
ALTER TABLE financial_settings 
  ADD COLUMN IF NOT EXISTS gross_margin_target_percent numeric DEFAULT 0;

-- Migrar dados existentes
UPDATE financial_settings 
SET gross_margin_target_percent = net_margin_percent 
WHERE gross_margin_target_percent = 0;
```

### 2. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/financialSettings.ts` | Adicionar `gross_margin_target_percent` ao tipo |
| `src/services/financialSettingsService.ts` | Incluir novo campo no upsert |
| `src/components/settings/FinancialSettingsForm.tsx` | Renomear campo para "Meta de Margem Bruta" |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Buscar configurações e passar meta para o `MarginCard` |

---

### 3. Formulário de Configurações

**Antes:**
- Campo "Margem Líquida" (nome confuso)

**Depois:**
- Campo "Meta de Margem Bruta" com descrição clara
- Rótulo: "Meta de Margem Bruta"
- Descrição: "Meta de margem bruta sobre a receita (ex: 32%)"

### 4. Indicador de Margem no Projeto

O `MarginCard` receberá a meta e mostrará:

**UI atualizada:**
```text
┌──────────────────────────────────────┐
│ 💰 Margem Bruta                      │
│                                      │
│ R$ 25.000,00  (28,5%)                │
│ de R$ 30.000,00 (orçado)             │
│                                      │
│ Meta: 32%  │  ⚠️ -3,5pp abaixo       │
└──────────────────────────────────────┘
```

Indicadores visuais:
- ✓ Verde: margem >= meta
- ⚠️ Amarelo/Vermelho: margem < meta

### 5. Implementação do MarginCard

```typescript
interface MarginCardProps {
  contractValue: number;
  totalPlannedCost: number;
  totalBudgetedCost: number;
  taxesPercent: number;
  grossMarginTarget: number; // Nova prop: ex: 32
}

function MarginCard({ ..., grossMarginTarget }: MarginCardProps) {
  // ...cálculo existente...
  
  // Compare com a meta
  const isAboveTarget = plannedPercent >= grossMarginTarget;
  const gapToTarget = plannedPercent - grossMarginTarget;
  
  return (
    <Card>
      {/* Valor da margem atual */}
      <p>{formatCurrency(grossMarginPlanned)} ({plannedPercent.toFixed(1)}%)</p>
      
      {/* Meta e indicador de gap */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">
          Meta: {grossMarginTarget}%
        </span>
        {!isAboveTarget && (
          <span className="text-xs text-amber-600">
            {gapToTarget.toFixed(1)}pp abaixo
          </span>
        )}
      </div>
    </Card>
  );
}
```

### 6. Buscar Configurações no ProjectCostsTab

```typescript
import { useFinancialSettings } from '@/hooks/useFinancialSettings';

export function ProjectCostsTab(...) {
  const { data: financialSettings } = useFinancialSettings();
  
  return (
    <>
      {isEditable && (
        <MarginCard
          contractValue={project.total_value}
          totalPlannedCost={totalPlanned}
          totalBudgetedCost={budgetedCosts.total}
          taxesPercent={budget?.taxes_percent || 0}
          grossMarginTarget={financialSettings?.gross_margin_target_percent || 0}
        />
      )}
    </>
  );
}
```

---

## Fluxo

```text
┌───────────────────────────────────────────────────────────────┐
│              Configurações → Financeiro                       │
│                                                               │
│  Meta de Margem Bruta: [32] %                                 │
│  (Meta de margem bruta sobre a receita)                       │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│              Projeto → Aba Custos                             │
│                                                               │
│  ┌────────────────────────────────────┐                       │
│  │ Margem Bruta                       │                       │
│  │                                    │                       │
│  │ R$ 25.000,00  (28,5%)              │                       │
│  │ de R$ 30.000,00 (orçado)           │                       │
│  │                                    │                       │
│  │ Meta: 32%  │  ⚠️ -3,5pp           │                       │
│  └────────────────────────────────────┘                       │
└───────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Visibilidade**: Gerente vê claramente se o projeto está acima ou abaixo da meta
2. **Padronização**: Meta centralizada nas configurações
3. **Tomada de decisão**: Ajuda a ajustar custos durante o planejamento
4. **Consistência**: Mesmo indicador para todos os projetos da empresa
