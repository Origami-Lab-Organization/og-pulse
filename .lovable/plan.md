

# Plano: Editor de Foto com Hover para Excluir e Exibicao na Listagem

## Resumo

Implementar tres melhorias relacionadas a foto do funcionario:
1. **Hover para excluir**: Ao passar o mouse sobre a foto, exibir icone de lixeira para remover
2. **Editor de foto**: Permitir zoom e reposicionamento da imagem antes de salvar
3. **Exibir foto na listagem**: Mostrar a foto cadastrada na tabela de funcionarios (em vez das iniciais)

---

## Alteracoes Necessarias

### 1. Nova Dependencia

Instalar a biblioteca `react-easy-crop` para o editor de imagem.

Esta biblioteca oferece:
- Zoom com slider ou scroll do mouse
- Arrastar para reposicionar
- Suporte para corte circular (perfeito para avatares)
- Retorna coordenadas para gerar imagem recortada

---

### 2. Novo Componente: ImageCropDialog

Criar componente `src/components/ui/image-crop-dialog.tsx` com:

- Area de corte circular
- Slider de zoom (1x a 3x)
- Arrastar para reposicionar
- Botao para resetar posicao
- Funcao auxiliar para gerar imagem recortada a partir das coordenadas

---

### 3. Atualizar EmployeeFormDialog

**Secao de Foto com Hover para Excluir:**

```text
+------------------------+
|      +---------+       |
|      |  Avatar |       |  <-- Foto ou icone de camera
|      +---------+       |
|                        |
|   [Hover sobre foto]   |
|      +---------+       |
|      |  [X]    |       |  <-- Overlay escuro com lixeira
|      +---------+       |
|                        |
|   [Adicionar Foto]     |  <-- Botao
+------------------------+
```

**Novo Fluxo de Upload:**

1. Usuario seleciona imagem
2. Valida tipo e tamanho (max 5MB)
3. Abre editor de corte
4. Usuario ajusta zoom e posicao
5. Clica "Aplicar"
6. Imagem recortada enviada para Storage
7. Preview atualizado

---

### 4. Atualizar EmployeesTable - Exibir Foto na Listagem

Modificar a coluna "nome" para exibir a foto do funcionario quando disponivel:

**Arquivo:** `src/components/employees/EmployeesTable.tsx`

Alterar linhas 59-65 para usar AvatarImage quando fotoUrl existir:

```typescript
// DE:
<Avatar className="h-9 w-9">
  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
    {initials}
  </AvatarFallback>
</Avatar>

// PARA:
<Avatar className="h-9 w-9">
  {employee.fotoUrl ? (
    <AvatarImage src={employee.fotoUrl} alt={employee.nome} />
  ) : null}
  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
    {initials}
  </AvatarFallback>
</Avatar>
```

Adicionar import do AvatarImage:
```typescript
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteracao |
|---------|-----------|
| `package.json` | Adicionar dependencia `react-easy-crop` |
| `src/components/ui/image-crop-dialog.tsx` | Criar componente do editor de imagem |
| `src/components/employees/EmployeeFormDialog.tsx` | Integrar hover para excluir e abrir editor |
| `src/components/employees/EmployeesTable.tsx` | Exibir foto no avatar da listagem |

---

## Experiencia Visual

### Hover na Foto (Formulario)
- Avatar normal quando mouse nao esta sobre a foto
- Ao passar mouse: overlay escuro (60% opacidade) com icone de lixeira branco
- Transicao suave de opacidade

### Editor de Corte
- Area de corte circular (formato avatar)
- Slider para controlar zoom (1x a 3x)
- Arrastar imagem para reposicionar
- Botao para resetar posicao
- Botoes "Cancelar" e "Aplicar"

### Listagem de Funcionarios
- Se funcionario tem foto: exibe a foto no avatar
- Se funcionario nao tem foto: exibe as iniciais (comportamento atual)

---

## Resultado Visual na Listagem

```text
+------------------------------------------------------------------+
| Funcionario          | Contato           | Status | Custo | ...  |
|----------------------|-------------------|--------|-------|------|
| [FOTO] Joao Silva    | joao@email.com    | Ativo  | R$... | ...  |
|   Desenvolvedor      |                   |        |       |      |
|----------------------|-------------------|--------|-------|------|
| [JS] Maria Santos    | maria@email.com   | Ativo  | R$... | ...  |
|   Designer           |                   |        |       |      |
+------------------------------------------------------------------+

[FOTO] = Avatar com foto real do funcionario
[JS]   = Avatar com iniciais (fallback quando nao tem foto)
```

---

## Criterios de Aceite

1. Ao passar mouse sobre foto existente no formulario, exibe overlay com lixeira
2. Clicar na lixeira remove a foto
3. Ao selecionar nova imagem, abre editor de corte
4. Editor permite zoom com slider
5. Editor permite arrastar para reposicionar
6. Botao "Aplicar" salva a imagem recortada
7. Botao "Cancelar" fecha editor sem alterar foto
8. Foto final e circular e otimizada para avatar
9. **Na listagem, funcionarios com foto exibem a foto no avatar**
10. **Funcionarios sem foto continuam exibindo as iniciais**

