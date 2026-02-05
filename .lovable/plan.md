
# Plano: Ajustes na Alocação de Equipe e Formulário de Projeto

## Alteração 1: Funcionários Disponíveis para Alocação

**Problema:** Na seção de alocação de equipe (aba Custos), apenas funcionários com status "ativo" aparecem para seleção. Funcionários "aguardando confirmação" (que ainda não fizeram o primeiro login) também devem estar disponíveis.

**Arquivo:** `src/components/projects/detail/ProjectLaborSection.tsx`

**Alteração:** Linha 115 - atualizar o filtro de funcionários

```typescript
// ANTES
const availableEmployees = useMemo(() => {
  return employees.filter((e) => e.status === 'ativo');
}, [employees]);

// DEPOIS
const availableEmployees = useMemo(() => {
  return employees.filter((e) => e.status === 'ativo' || e.status === 'aguardando_confirmacao');
}, [employees]);
```

---

## Alteração 2: Formulário de Projeto Contínuo

**Problema:** Ao criar um projeto contínuo, o campo "Valor Total do Projeto" não faz sentido semanticamente (deveria ser "Valor Recorrente") e o campo "Quantidade de Parcelas" é desnecessário.

**Arquivo:** `src/components/projects/ProjectFormDialog.tsx`

**Alterações:**

1. **Campo de Valor (linha 341-360):** Atualizar o label dinamicamente
   - Se `isContinuous = true`: "Valor Recorrente Mensal *"
   - Se `isContinuous = false`: "Valor Total do Projeto *"

2. **Campo de Parcelas (linhas 388-400):** Ocultar quando for projeto contínuo
   - Mostrar apenas quando `!isContinuous`
   - Ajustar layout do grid de 2 colunas para 1 quando contínuo

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectLaborSection.tsx` | Incluir funcionários "aguardando_confirmacao" na lista de disponíveis |
| `ProjectFormDialog.tsx` | Ajustar label do valor e ocultar parcelas para projetos contínuos |
