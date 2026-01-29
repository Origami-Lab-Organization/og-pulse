
# Plano: Adicionar Foto e Data de Nascimento ao Cadastro de Funcionarios

## Resumo

Adicionar dois novos campos ao formulario de funcionarios:
1. **Foto do funcionario** (opcional) - upload de imagem
2. **Data de nascimento** (obrigatoria) - campo de data

---

## Alteracoes Necessarias

### 1. Banco de Dados

Adicionar duas novas colunas na tabela `employees`:

```sql
-- Adicionar campo de data de nascimento (obrigatorio para novos registros)
ALTER TABLE employees ADD COLUMN data_nascimento date;

-- Adicionar campo de URL da foto (opcional)
ALTER TABLE employees ADD COLUMN foto_url text;

-- Criar bucket de storage para fotos de funcionarios
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);

-- Politica para upload de fotos (admins do tenant)
CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Politica para visualizar fotos (usuarios do tenant)
CREATE POLICY "Users can view employee photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-photos');

-- Politica para deletar fotos (admins)
CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

### 2. Tipos e Interfaces

**Arquivo:** `src/types/employee.ts`

Adicionar campos ao interface Employee:

```typescript
export interface Employee {
  // ... campos existentes ...
  dataNascimento?: string;  // Data de nascimento
  fotoUrl?: string;         // URL da foto
}
```

**Arquivo:** `src/services/employeeService.ts`

Adicionar campos ao EmployeeDB e CreateEmployeeInput:

```typescript
export interface EmployeeDB {
  // ... campos existentes ...
  data_nascimento: string | null;
  foto_url: string | null;
}

export interface CreateEmployeeInput {
  // ... campos existentes ...
  dataNascimento: string;
  fotoUrl?: string;
}
```

### 3. Schema de Validacao do Formulario

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

Adicionar validacao no schema:

```typescript
const baseFormSchema = z.object({
  // ... campos existentes ...
  dataNascimento: z.string().min(1, 'Data de nascimento e obrigatoria'),
  fotoUrl: z.string().optional(),
});
```

### 4. Interface do Formulario

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

Adicionar componente de upload de foto e campo de data de nascimento na etapa "Dados Pessoais":

```typescript
// Estado para preview da foto
const [fotoPreview, setFotoPreview] = useState<string | null>(null);
const [uploadingPhoto, setUploadingPhoto] = useState(false);

// Handler para upload de foto
const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Validar tipo e tamanho
  if (!file.type.startsWith('image/')) {
    toast({ title: 'Erro', description: 'Apenas imagens sao permitidas', variant: 'destructive' });
    return;
  }
  if (file.size > 5 * 1024 * 1024) { // 5MB
    toast({ title: 'Erro', description: 'Imagem deve ter no maximo 5MB', variant: 'destructive' });
    return;
  }
  
  setUploadingPhoto(true);
  
  // Upload para storage
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('employee-photos')
    .upload(fileName, file);
  
  if (error) {
    toast({ title: 'Erro', description: 'Falha ao enviar foto', variant: 'destructive' });
    setUploadingPhoto(false);
    return;
  }
  
  // Obter URL publica
  const { data: urlData } = supabase.storage
    .from('employee-photos')
    .getPublicUrl(data.path);
  
  form.setValue('fotoUrl', urlData.publicUrl);
  setFotoPreview(urlData.publicUrl);
  setUploadingPhoto(false);
};
```

Layout do formulario na etapa de Dados Pessoais:

```typescript
{/* Foto do Funcionario */}
<div className="flex flex-col items-center gap-4 mb-6">
  <Avatar className="h-24 w-24">
    {fotoPreview ? (
      <AvatarImage src={fotoPreview} alt="Foto do funcionario" />
    ) : (
      <AvatarFallback>
        <Camera className="h-8 w-8 text-muted-foreground" />
      </AvatarFallback>
    )}
  </Avatar>
  
  <div className="flex gap-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => document.getElementById('photo-upload')?.click()}
      disabled={uploadingPhoto}
    >
      {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
      {fotoPreview ? 'Alterar Foto' : 'Adicionar Foto'}
    </Button>
    {fotoPreview && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setFotoPreview(null);
          form.setValue('fotoUrl', '');
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    )}
  </div>
  
  <input
    id="photo-upload"
    type="file"
    accept="image/*"
    className="hidden"
    onChange={handlePhotoUpload}
  />
</div>

{/* Campo Data de Nascimento */}
<FormField
  control={form.control}
  name="dataNascimento"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Data de Nascimento *</FormLabel>
      <FormControl>
        <Input type="date" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 5. Edge Function

**Arquivo:** `supabase/functions/create-employee-user/index.ts`

Adicionar campos ao request e insert:

```typescript
interface CreateEmployeeRequest {
  // ... campos existentes ...
  dataNascimento: string;
  fotoUrl: string | null;
}

// No insert:
const { data: employee, error: employeeError } = await adminClient
  .from('employees')
  .insert({
    // ... campos existentes ...
    data_nascimento: dataNascimento,
    foto_url: fotoUrl || null,
  })
```

### 6. Hook useEmployees

**Arquivo:** `src/hooks/useEmployees.ts`

Adicionar mapeamento dos novos campos:

```typescript
export const dbToEmployee = (db: EmployeeWithRelations) => {
  return {
    // ... campos existentes ...
    dataNascimento: db.data_nascimento,
    fotoUrl: db.foto_url,
  };
};
```

### 7. Service

**Arquivo:** `src/services/employeeService.ts`

Adicionar mapeamento no update:

```typescript
if (updates.dataNascimento !== undefined) dbUpdates.data_nascimento = updates.dataNascimento;
if (updates.fotoUrl !== undefined) dbUpdates.foto_url = updates.fotoUrl;
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar colunas `data_nascimento` e `foto_url`, criar bucket e politicas |
| `src/types/employee.ts` | Adicionar campos `dataNascimento` e `fotoUrl` |
| `src/services/employeeService.ts` | Adicionar campos no EmployeeDB, CreateEmployeeInput e update |
| `src/hooks/useEmployees.ts` | Adicionar mapeamento dos novos campos |
| `src/components/employees/EmployeeFormDialog.tsx` | Adicionar upload de foto e campo de data de nascimento |
| `supabase/functions/create-employee-user/index.ts` | Adicionar campos no request e insert |

---

## Fluxo de Upload de Foto

```text
Usuario seleciona arquivo
        |
        v
Validacao (tipo imagem, max 5MB)
        |
        v
Upload para Storage (bucket: employee-photos)
        |
        v
Obtem URL publica
        |
        v
Salva URL no formulario
        |
        v
Exibe preview no Avatar
```

---

## Criterios de Aceite

1. Campo de data de nascimento e obrigatorio e validado
2. Foto e opcional com preview ao selecionar
3. Fotos sao armazenadas no Storage (nao no banco de dados)
4. Apenas imagens ate 5MB sao aceitas
5. Na edicao, foto e data de nascimento existentes sao carregados
6. Botao para remover foto selecionada
7. Funcionarios existentes continuam funcionando (campos nullable para migracao)

---

## Observacoes para Dados Existentes

Como o campo `data_nascimento` e obrigatorio para novos funcionarios, mas ja existem registros, a coluna sera criada como nullable. Ao editar um funcionario existente sem data de nascimento, o sistema exigira o preenchimento.
