
# Plano: Integrar Custos do Projeto com Orcamento (Versao Ajustada)

## Visao Geral

Quando um projeto e criado a partir de um orcamento, os custos sao herdados mas podem ser editados. O principal ajuste e que a mao de obra pode ser dividida - por exemplo, um papel de "Consultor de Inovacao" com 70h pode virar 2 consultores de 35h cada.

## Logica de Heranca

```text
ORCAMENTO                          PROJETO
-------------------------------------
Consultor Inovacao (Senior)  -->   Consultor Inovacao - Maria (35h)
  R$ 120/h, 70h/mes                Consultor Inovacao - Joao (35h)
                                   (valor/hora R$ 120 herdado)

Agencia MKT                  -->   Agencia MKT
  R$ 5.000/mes                     R$ 5.000/mes (editavel)

Licenca Software             -->   Licenca Software
  R$ 2.000                         R$ 2.000 (editavel)
```

## Fase 1: Alteracao no Banco de Dados

Adicionar colunas para vincular membros do projeto aos papeis do orcamento:

```sql
-- Adicionar referencia ao papel do orcamento (opcional, para herdar valor/hora)
ALTER TABLE project_members 
ADD COLUMN budget_role_id UUID REFERENCES budget_roles(id);

-- Adicionar valor/hora diretamente no membro (para quando nao tiver orcamento)
ALTER TABLE project_members 
ADD COLUMN hourly_rate NUMERIC NOT NULL DEFAULT 0;
```

**Politicas RLS**: Nao necessarias pois a tabela project_members ja tem RLS.

## Fase 2: Fechar Negocio - Copiar Estrutura do Orcamento

Ao fechar negocio, copiar a estrutura do orcamento:

**Arquivo:** `src/hooks/useCloseBusinessDeal.ts`

```typescript
// Apos criar o projeto:

// 1. Copiar fornecedores do orcamento
for (const supplier of budget.suppliers) {
  const { data: projectSupplier } = await supabase
    .from('project_suppliers')
    .insert({
      project_id: project.id,
      name: supplier.name,
      description: supplier.description,
      monthly_value: supplier.monthly_value,
    })
    .select()
    .single();

  // Criar registros mensais
  for (let month = 1; month <= budget.duration_months; month++) {
    await supabase.from('project_supplier_months').insert({
      project_supplier_id: projectSupplier.id,
      month_number: month,
      value: supplier.monthly_value,
    });
  }
}

// 2. Copiar materiais
for (const material of budget.materials) {
  await supabase.from('project_materials').insert({
    project_id: project.id,
    description: material.description,
    value: material.value,
    month_number: 1,
  });
}

// 3. Criar "slots" de mao de obra baseados nos papeis do orcamento
for (const role of budget.roles) {
  await supabase.from('project_members').insert({
    project_id: project.id,
    employee_id: null, // A ser preenchido depois
    role: role.role_name,
    seniority: role.seniority,
    budget_role_id: role.id,
    hourly_rate: role.hourly_rate,
    hours_per_month: 0,
  });

  // Copiar horas mensais do orcamento para project_member_months
  for (const month of role.months) {
    // Sera associado ao membro quando o employee_id for selecionado
  }
}
```

**Problema**: `project_members.employee_id` nao aceita null atualmente.

**Solucao Alternativa**: Nao criar os membros automaticamente. Exibir os papeis do orcamento na interface e permitir que o usuario adicione membros com base neles.

## Fase 3: Interface de Mao de Obra (Refatorada)

A secao de Mao de Obra tera duas partes:

### 3.1 Papeis do Orcamento (Referencia)

Exibir um card resumo dos papeis definidos no orcamento:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ PAPEIS DO ORCAMENTO (referencia)                                             │
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ Consultor Inovacao (Senior) - R$ 120/h - 70h/mes - Total: R$ 8.400        │
│ │ Lider de Projeto (Especialista) - R$ 180/h - 10h/mes - Total: R$ 1.800    │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Alocacao de Equipe (Editavel)

Permitir adicionar membros da equipe, podendo dividir os papeis:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ALOCACAO DE EQUIPE                                    [+ Adicionar Membro]   │
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ Funcionario      │ Papel              │ Valor/h │ M1  │ M2  │ Total       │
│ │──────────────────│────────────────────│─────────│─────│─────│─────────────│
│ │ Maria Santos     │ Consultor Inovacao │ R$ 120  │ 35h │ 35h │ R$ 8.400    │
│ │ Joao Silva       │ Consultor Inovacao │ R$ 120  │ 35h │ 35h │ R$ 8.400    │
│ │ Ana Costa        │ Lider de Projeto   │ R$ 180  │ 10h │ 10h │ R$ 3.600    │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

Ao adicionar um membro:
- Selecionar papel do orcamento (traz valor/hora automaticamente)
- Ou definir papel customizado (digitar valor/hora manualmente)
- Selecionar funcionario
- As horas sao editaveis

## Resumo de Alteracoes

### Banco de Dados

| Alteracao | Descricao |
|-----------|-----------|
| `project_members.budget_role_id` | Referencia ao papel do orcamento |
| `project_members.hourly_rate` | Valor/hora do membro (herdado ou manual) |
| Permitir `employee_id = null` | Para "slots" nao preenchidos (opcional) |

### Arquivos de Codigo

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useCloseBusinessDeal.ts` | Copiar fornecedores, materiais ao fechar negocio |
| `src/services/projectService.ts` | Incluir `duration_months` na criacao |
| `src/types/project.ts` | Adicionar `budget_role_id` e `hourly_rate` em `ProjectMemberDB` |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Refatorar para: (1) exibir papeis do orcamento, (2) permitir alocacao dividida |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Usar todos os meses da duracao |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Buscar orcamento vinculado e passar para componentes |
| `src/hooks/useBudgets.ts` | Adicionar hook para buscar orcamento por ID |

### Interface do Dialogo "Adicionar Membro"

```text
┌────────────────────────────────────────────────────────────────────┐
│ Adicionar Membro ao Projeto                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Funcionario                                                        │
│ [ Selecione um funcionario                            ▼ ]         │
│                                                                    │
│ Papel no Projeto                                                   │
│ [ Consultor de Inovacao (Senior) - R$ 120/h           ▼ ]         │
│                                                                    │
│   [x] Usar papel do orcamento (herda valor/hora)                  │
│   [ ] Definir papel customizado                                   │
│                                                                    │
│ Valor/Hora (automatico quando usar papel do orcamento)            │
│ [ R$ 120,00 ] (desabilitado)                                      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                  [ Cancelar ]  [ Adicionar ]       │
└────────────────────────────────────────────────────────────────────┘
```

## Fluxo de Uso

1. Usuario cria orcamento com papeis, fornecedores e materiais
2. Usuario fecha negocio (proposta -> ativo)
3. Sistema cria projeto com:
   - `duration_months` do orcamento
   - Copia de fornecedores com valores mensais
   - Copia de materiais
4. Usuario acessa aba Custos do projeto
5. Ve papeis do orcamento como referencia
6. Adiciona membros da equipe selecionando papel (herda valor/hora) e funcionario
7. Pode dividir um papel entre multiplas pessoas
8. Edita horas mes a mes

## Consideracoes Tecnicas

1. **Valor/hora**: Herdado do papel do orcamento ou digitado manualmente
2. **Multiplos membros por papel**: Permitido (ex: 2 consultores)
3. **Horas editaveis**: Usuario pode ajustar horas por mes
4. **Validacao**: Opcional - alertar se total de horas alocadas difere do orcamento
5. **Projetos sem orcamento**: Continua funcionando normalmente (valor/hora manual)
