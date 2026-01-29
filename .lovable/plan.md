

# Plano: Melhorar Experiência de Cadastro de Papeis com Multiplas Senioridades

## Analise do Cenario Atual

Atualmente, para cadastrar um papel como "Desenvolvedor" com 3 niveis de senioridade, o usuario precisa:
1. Clicar em "Novo Papel" e cadastrar "Desenvolvedor Junior" com valor R$ 80,00
2. Clicar novamente em "Novo Papel" e cadastrar "Desenvolvedor Pleno" com valor R$ 120,00
3. Clicar novamente em "Novo Papel" e cadastrar "Desenvolvedor Senior" com valor R$ 180,00

Isso gera 3 cliques, 3 formularios e retrabalho de digitar o mesmo nome do papel.

---

## Recomendacao de UX: Modo Hibrido com Toggle

A melhor experiencia e um formulario unico que permite alternar entre dois modos:

**Modo Simples** (toggle desativado - padrao):
- Campo de nome do papel
- Select de senioridade unica
- Campo de valor hora unico
- Ideal para adicionar uma senioridade especifica ou editar

**Modo Multiplas Senioridades** (toggle ativado):
- Campo de nome do papel
- Checkboxes para selecionar quais senioridades criar (Junior, Pleno, Senior)
- Campo de valor hora para cada senioridade selecionada
- Cria multiplos registros de uma vez

```text
+--------------------------------------------------+
|  Novo Papel                                      |
+--------------------------------------------------+
|  Nome do Papel *                                 |
|  [Desenvolvedor                              ]   |
|                                                  |
|  [ ] Criar multiplas senioridades                |
|                                                  |
|  Se DESATIVADO:                                  |
|  +--------------------------------------------+  |
|  | Senioridade: [Pleno v]  Valor: [R$ 120]   |  |
|  +--------------------------------------------+  |
|                                                  |
|  Se ATIVADO:                                     |
|  +--------------------------------------------+  |
|  | [x] Junior   Valor/Hora: [R$ 80,00    ]   |  |
|  | [x] Pleno    Valor/Hora: [R$ 120,00   ]   |  |
|  | [x] Senior   Valor/Hora: [R$ 180,00   ]   |  |
|  +--------------------------------------------+  |
|                                                  |
|  Descricao (opcional)                            |
|  [                                           ]   |
|                                                  |
|              [Cancelar]  [Cadastrar]             |
+--------------------------------------------------+
```

---

## Vantagens desta Abordagem

| Aspecto | Beneficio |
|---------|-----------|
| Flexibilidade | Usuario escolhe criar 1, 2 ou 3 senioridades de uma vez |
| Produtividade | Reduz de 3 formularios para 1 ao criar papel completo |
| Familiaridade | Modo simples continua funcionando como antes |
| Clareza | Toggle explicito deixa claro o que vai acontecer |
| Consistencia | Mesma descricao e status aplicados a todas senioridades |

---

## Alteracoes Necessarias

### 1. Atualizar RoleRateFormDialog

**Arquivo: `src/components/pricing/RoleRateFormDialog.tsx`**

- Adicionar estado para controle do modo (simples/multiplo)
- Adicionar checkboxes para selecionar senioridades
- Adicionar campos de valor hora dinamicos por senioridade
- Validacao condicional baseada no modo selecionado

### 2. Criar Hook para Criacao em Lote

**Arquivo: `src/hooks/useRoleRates.ts`**

- Adicionar `useCreateMultipleRoleRates` que recebe array de inputs
- Reutiliza o service existente com Promise.all ou insercao em lote

### 3. Atualizar Service (Opcional)

**Arquivo: `src/services/roleRateService.ts`**

- Adicionar metodo `createMultiple` para insercao em lote
- Melhora performance ao criar 3 registros de uma vez

### 4. Atualizar Tipos

**Arquivo: `src/types/roleRate.ts`**

- Adicionar tipo para criacao em lote

---

## Fluxo de Uso

### Cenario 1: Criar papel com todas as senioridades
1. Usuario clica "Novo Papel"
2. Digita "Desenvolvedor"
3. Ativa toggle "Criar multiplas senioridades"
4. Marca Junior, Pleno e Senior
5. Preenche os 3 valores hora
6. Clica "Cadastrar"
7. Sistema cria 3 registros de uma vez

### Cenario 2: Criar papel com senioridade especifica
1. Usuario clica "Novo Papel"
2. Digita "Tech Lead"
3. Mantem toggle desativado
4. Seleciona "Senior"
5. Preenche valor hora
6. Clica "Cadastrar"
7. Sistema cria 1 registro

### Cenario 3: Editar papel existente
1. Usuario clica em Editar no papel "Desenvolvedor Pleno"
2. Formulario abre no modo simples (toggle oculto na edicao)
3. Usuario altera o valor hora
4. Clica "Salvar"

---

## Detalhes Tecnicos

### Estrutura do Formulario com Multiplas Senioridades

```typescript
// Schema Zod para modo multiplo
const multipleRoleRateSchema = z.object({
  roleName: z.string().min(2),
  isMultiple: z.boolean(),
  // Modo simples
  seniority: z.string().optional(),
  hourlyRate: z.string().optional(),
  // Modo multiplo
  juniorEnabled: z.boolean(),
  juniorRate: z.string().optional(),
  plenoEnabled: z.boolean(),
  plenoRate: z.string().optional(),
  seniorEnabled: z.boolean(),
  seniorRate: z.string().optional(),
  // Comum
  description: z.string().optional(),
  isActive: z.boolean(),
}).refine((data) => {
  if (!data.isMultiple) {
    return !!data.seniority && !!data.hourlyRate;
  }
  // Pelo menos uma senioridade deve estar ativa
  const hasAtLeastOne = data.juniorEnabled || data.plenoEnabled || data.seniorEnabled;
  // Cada senioridade ativa deve ter valor
  const juniorValid = !data.juniorEnabled || !!data.juniorRate;
  const plenoValid = !data.plenoEnabled || !!data.plenoRate;
  const seniorValid = !data.seniorEnabled || !!data.seniorRate;
  return hasAtLeastOne && juniorValid && plenoValid && seniorValid;
});
```

### Insercao em Lote no Service

```typescript
async createMultiple(inputs: CreateRoleRateInput[], tenantId: string): Promise<RoleRateDB[]> {
  const records = inputs.map(input => ({
    tenant_id: tenantId,
    role_name: input.roleName,
    seniority: input.seniority,
    hourly_rate: input.hourlyRate,
    description: input.description || null,
    is_active: input.isActive ?? true,
  }));

  const { data, error } = await supabase
    .from('role_rates')
    .insert(records)
    .select();

  if (error) throw error;
  return data as RoleRateDB[];
}
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/pricing/RoleRateFormDialog.tsx` | Adicionar toggle e campos dinamicos para multiplas senioridades |
| `src/hooks/useRoleRates.ts` | Adicionar hook `useCreateMultipleRoleRates` |
| `src/services/roleRateService.ts` | Adicionar metodo `createMultiple` |
| `src/types/roleRate.ts` | Adicionar tipos para criacao em lote |
| `src/pages/Pricing.tsx` | Atualizar para usar novo hook quando modo multiplo |

---

## Criterios de Aceite

1. Toggle "Criar multiplas senioridades" aparece no formulario de novo papel
2. Ao ativar toggle, aparecem checkboxes para Junior, Pleno e Senior
3. Cada checkbox ativado exibe campo de valor hora correspondente
4. Ao cadastrar, sistema cria todos os registros selecionados
5. Modo simples continua funcionando como antes (toggle desativado)
6. Na edicao, toggle nao aparece (sempre modo simples)
7. Validacao exige pelo menos uma senioridade quando toggle ativo
8. Erro de duplicidade e tratado adequadamente

