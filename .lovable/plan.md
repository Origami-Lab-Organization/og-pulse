
# Reembolsos na Aba de Custos do Projeto

## Resumo

Adicionar uma nova secao "Reembolsos" na aba de Custos do projeto, exibindo os reembolsos aprovados vinculados ao projeto. Tambem adicionar um quinto card de resumo no topo (ou expandir o grid para 5 colunas).

## Mudancas

### 1. Hook para buscar reembolsos aprovados de um projeto

**Novo hook em `src/hooks/useReimbursements.ts`**

Adicionar `useProjectApprovedReimbursements(projectId)` que busca reembolsos com `status = 'approved'` e `project_id = projectId`.

### 2. Card de Reembolso no topo da aba

**Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`**

- Expandir o grid de 4 para 5 colunas: `lg:grid-cols-5`
- Adicionar um novo `CostCard` com icone `Receipt` (cor laranja/rose) antes do card de Custo Total
- O card mostra apenas o valor realizado (total dos reembolsos aprovados), sem comparativo planejado
- Incluir o valor dos reembolsos no calculo de `totalActual` e `totalPlanned`

### 3. Secao de Reembolsos (tabela)

**Novo arquivo: `src/components/projects/detail/ProjectReimbursementsSection.tsx`**

Secao somente leitura (sem adicionar/remover) exibindo os reembolsos aprovados do projeto em uma tabela com colunas:
- Funcionario solicitante
- Descricao
- Valor
- Data de aprovacao

Seguindo o mesmo padrao visual das secoes de Materiais/Fornecedores (Card com CardHeader e CardTitle com icone `Receipt`).

### 4. Integracao no ProjectCostsTab

Renderizar `ProjectReimbursementsSection` apos a secao de Materiais.

## Arquivos Modificados/Criados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/hooks/useReimbursements.ts` | Editado | Adicionar `useProjectApprovedReimbursements` |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Editado | Card de reembolso + grid 5 colunas + incluir no total |
| `src/components/projects/detail/ProjectReimbursementsSection.tsx` | Novo | Tabela de reembolsos aprovados |

## Detalhes Tecnicos

### Hook `useProjectApprovedReimbursements`

```typescript
export function useProjectApprovedReimbursements(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-reimbursements', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with requester names
      const ids = [...new Set(data.map(r => r.requested_by))];
      const { data: emps } = await supabase
        .from('employees')
        .select('id, nome')
        .in('id', ids);
      const nameMap = new Map(emps?.map(e => [e.id, e.nome]));

      return data.map(r => ({
        ...r,
        requester_name: nameMap.get(r.requested_by) || 'Desconhecido',
      }));
    },
    enabled: !!projectId,
  });
}
```

### Calculo no CostsTab

```typescript
const reimbursementCostsActual = useMemo(() => {
  return approvedReimbursements.reduce((sum, r) => sum + Number(r.total_amount), 0);
}, [approvedReimbursements]);

// Reembolso nao tem planejado - so entra no realizado
const totalActual = laborCostsActual + supplierCostsActual + materialCostsActual + reimbursementCostsActual;
```

### Grid de cards atualizado

O grid passara de `lg:grid-cols-4` para `lg:grid-cols-5`, com o card de Reembolso usando icone `Receipt` e cores rose/pink, posicionado antes do card de Custo Total.
