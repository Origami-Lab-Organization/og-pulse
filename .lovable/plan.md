

# Plano: Modais para Lançamento de Custos Reais

## Problema Atual

A interface atual exibe inputs inline para cada mês de cada fornecedor, resultando em:
- Muitos campos visíveis simultaneamente
- Experiência confusa e poluída
- Dificuldade de navegação em projetos longos

## Nova Experiência Proposta

### Fluxo para Fornecedores

Na linha de cada fornecedor, adicionar um botão "Lançar Custo" que abre um modal simples:

```
┌─ Lançar Custo Real ────────────────────────────────────────┐
│                                                             │
│  Fornecedor: AWS Hosting                                    │
│                                                             │
│  Mês do Projeto *                                           │
│  [▼ Mês 3                                  ]                │
│                                                             │
│  Valor Realizado (R$) *                                     │
│  [_______________1.450,00_______________]                   │
│                                                             │
│  Observação (opcional)                                      │
│  [________________________________]                         │
│                                                             │
│                          [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo para Materiais

Adicionar botão "Registrar Realizado" na seção que abre modal para marcar materiais como pagos:

```
┌─ Registrar Material Realizado ──────────────────────────────┐
│                                                             │
│  Selecione os materiais já pagos/realizados:                │
│                                                             │
│  ☑ Licença Software X - Mês 2 - R$ 2.500,00                │
│  ☐ Equipamento Y - Mês 3 - R$ 1.200,00                     │
│  ☑ Serviço Z - Mês 1 - R$ 800,00                           │
│                                                             │
│                          [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. `ProjectSuppliersSection.tsx`

**Simplificar tabela em modo execução:**
- Remover inputs inline de valor realizado
- Exibir apenas valores (Plan | Real) como texto
- Adicionar coluna de ações com botão "Lançar"

**Novo modal `SupplierActualDialog`:**
- Select para escolher o mês
- Input para valor realizado
- Campo opcional para observação
- Salva usando `upsertSupplierActual`

```typescript
// Botão na coluna de ações (quando canEditActuals)
<Button variant="outline" size="sm" onClick={() => openActualDialog(supplier)}>
  <DollarSign className="h-4 w-4 mr-1" />
  Lançar Custo
</Button>
```

### 2. `ProjectMaterialsSection.tsx`

**Adicionar botão no header da seção:**
- Visível quando `canEditActuals` e há materiais não realizados
- Abre modal com lista de materiais pendentes

**Novo modal `MaterialRealizeDialog`:**
- Lista checkboxes dos materiais não realizados
- Permite marcar vários de uma vez
- Salva em batch

```typescript
// Botão no header (ao lado do "Adicionar Material")
{canEditActuals && materiaisNaoRealizados.length > 0 && (
  <Button variant="outline" onClick={() => setRealizeDialogOpen(true)}>
    <Check className="mr-2 h-4 w-4" />
    Registrar Realizados
  </Button>
)}
```

---

## Estrutura Visual Final

### Fornecedores (Projeto em Execução)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🚚 FORNECEDORES                                                             │
├─────────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ Nome            │  Mês 1       │  Mês 2       │  Total       │ Ações       │
│                 │  Plan | Real │  Plan | Real │  Plan | Real │             │
├─────────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ AWS Hosting     │ R$1.500 | -  │ R$1.500 | -  │ R$3.000 | -  │ [$ Lançar]  │
│ Marketing       │ R$500 | R$500│ R$500 | -    │ R$1.000|R$500│ [$ Lançar]  │
└─────────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

### Materiais (Projeto em Execução)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📦 MATERIAIS                                      [✓ Registrar Realizados]  │
├──────────────────────┬────────┬──────────────┬──────────────────────────────┤
│ Descrição            │  Mês   │    Valor     │ Realizado                    │
├──────────────────────┼────────┼──────────────┼──────────────────────────────┤
│ Licença software X   │ Mês 2  │ R$ 2.500,00  │ ✓ Sim                        │
│ Equipamento Y        │ Mês 3  │ R$ 1.200,00  │ Não                          │
└──────────────────────┴────────┴──────────────┴──────────────────────────────┘
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectSuppliersSection.tsx` | Remover inputs inline, adicionar coluna de ações, criar modal de lançamento |
| `ProjectMaterialsSection.tsx` | Adicionar botão e modal para registrar materiais realizados em batch |

---

## Benefícios

- Interface limpa e organizada
- Ação intencional (clicar no botão) ao invés de edição acidental
- Modal focado em uma tarefa específica
- Possibilidade de adicionar campos extras (observação, número da NF)
- Melhor experiência em projetos com muitos meses

