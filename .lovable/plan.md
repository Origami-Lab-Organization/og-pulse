
# Plano: Upload de PDF para Preenchimento Automático de Fornecedor

## Objetivo

Adicionar funcionalidade de upload de Cartão CNPJ (PDF) no cadastro de fornecedores, utilizando a mesma Edge Function de IA (`parse-cnpj-card`) já existente para preencher automaticamente os campos do formulário.

## Análise do Padrão Existente

O `ClientFormDialog` já implementa essa funcionalidade com:
- Estado para controle: `isExtractingPdf`, `pdfExtracted`
- Input file oculto + label estilizado como área de drop
- Chamada à Edge Function `parse-cnpj-card`
- Preenchimento dos campos com formatação `toTitleCase`
- Feedback visual durante extração e após sucesso

---

## Alterações Técnicas

### Arquivo: `src/components/suppliers/SupplierFormDialog.tsx`

#### 1. Novos imports

```tsx
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { toTitleCase } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
```

#### 2. Novos estados

```tsx
const { toast } = useToast();
const [isExtractingPdf, setIsExtractingPdf] = useState(false);
const [pdfExtracted, setPdfExtracted] = useState(false);
```

#### 3. Função de upload de PDF

```tsx
const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    toast({
      title: 'Formato inválido',
      description: 'Por favor, selecione um arquivo PDF.',
      variant: 'destructive',
    });
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast({
      title: 'Arquivo muito grande',
      description: 'O arquivo deve ter no máximo 10MB.',
      variant: 'destructive',
    });
    return;
  }

  setIsExtractingPdf(true);
  setPdfExtracted(false);

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64 = (reader.result as string).split(',')[1];

      const { data, error } = await supabase.functions.invoke('parse-cnpj-card', {
        body: { pdfBase64: base64 },
      });

      if (error) throw new Error(error.message || 'Erro ao processar o documento');
      if (data.error) throw new Error(data.error);

      // Preencher os campos com formatação Title Case
      if (data.razaoSocial) form.setValue('companyName', toTitleCase(data.razaoSocial));
      if (data.nomeFantasia) form.setValue('tradingName', toTitleCase(data.nomeFantasia));
      if (data.cnpj) {
        const cleanCnpj = data.cnpj.replace(/\D/g, '');
        form.setValue('cnpj', cleanCnpj);
        setCnpjDisplay(formatCNPJ(cleanCnpj));
      }
      if (data.cep) {
        const cleanCep = data.cep.replace(/\D/g, '');
        form.setValue('cep', cleanCep);
        setCepDisplay(formatCEP(cleanCep));
      }
      if (data.logradouro) form.setValue('logradouro', toTitleCase(data.logradouro));
      if (data.numero) form.setValue('numero', data.numero);
      if (data.complemento) form.setValue('complemento', toTitleCase(data.complemento));
      if (data.bairro) form.setValue('bairro', toTitleCase(data.bairro));
      if (data.cidade) form.setValue('cidade', toTitleCase(data.cidade));
      if (data.estado) form.setValue('estado', data.estado.toUpperCase());

      setPdfExtracted(true);
      toast({
        title: 'Dados extraídos',
        description: 'Os dados do Cartão CNPJ foram preenchidos automaticamente.',
      });
    } catch (err) {
      toast({
        title: 'Erro ao extrair dados',
        description: err instanceof Error ? err.message : 'Não foi possível extrair os dados do PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExtractingPdf(false);
      e.target.value = '';
    }
  };

  reader.onerror = () => {
    toast({
      title: 'Erro ao ler arquivo',
      description: 'Não foi possível ler o arquivo PDF.',
      variant: 'destructive',
    });
    setIsExtractingPdf(false);
  };

  reader.readAsDataURL(file);
};
```

#### 4. Reset do estado ao abrir/fechar dialog

No `useEffect` existente, adicionar:
```tsx
setPdfExtracted(false);
```

#### 5. Reset após submit

Na função `handleSubmit`, adicionar:
```tsx
setPdfExtracted(false);
```

#### 6. Componente de upload no JSX

Adicionar antes da seção "Dados da Empresa", apenas para novo cadastro (`!isEditing`):

```tsx
{!isEditing && (
  <div className="relative">
    <input
      type="file"
      accept=".pdf"
      onChange={handlePdfUpload}
      className="hidden"
      id="supplier-cnpj-pdf-upload"
      disabled={isExtractingPdf || isLoading}
    />
    <label
      htmlFor="supplier-cnpj-pdf-upload"
      className={`
        flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-dashed
        transition-colors cursor-pointer
        ${isExtractingPdf ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
        ${pdfExtracted ? 'border-accent bg-accent/10' : ''}
      `}
    >
      {isExtractingPdf ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="text-sm">
            <p className="font-medium text-primary">Extraindo dados...</p>
            <p className="text-muted-foreground">Analisando o Cartão CNPJ</p>
          </div>
        </>
      ) : pdfExtracted ? (
        <>
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-primary">Dados extraídos com sucesso!</p>
            <p className="text-muted-foreground">Clique para enviar outro arquivo</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Enviar Cartão CNPJ (PDF)</p>
            <p className="text-muted-foreground">Opcional - preenche os campos automaticamente</p>
          </div>
          <Upload className="h-4 w-4 text-muted-foreground ml-auto" />
        </>
      )}
    </label>
  </div>
)}
```

---

## Resumo das Alterações

| Item | Descrição |
|------|-----------|
| **Imports** | Adicionar `Upload`, `FileText`, `CheckCircle2`, `toTitleCase`, `supabase`, `useToast` |
| **Estados** | `isExtractingPdf`, `pdfExtracted` |
| **Função** | `handlePdfUpload` - lê PDF, chama Edge Function, preenche campos |
| **UI** | Área de upload com 3 estados visuais (padrão, extraindo, sucesso) |
| **Reset** | Limpar estado no `useEffect` e no `handleSubmit` |

---

## Reutilização

A Edge Function `parse-cnpj-card` já existe e funciona tanto para clientes quanto para fornecedores, pois ambos usam os mesmos dados do Cartão CNPJ:
- Razão Social → `companyName`
- Nome Fantasia → `tradingName`
- CNPJ → `cnpj`
- Endereço completo → `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado`

---

## Resultado Esperado

1. **Upload intuitivo**: Área de drag & drop visualmente similar ao cadastro de clientes
2. **Extração automática**: Dados do PDF preenchidos automaticamente via IA
3. **Formatação profissional**: Nomes em Title Case, preservando siglas (LTDA, ME, etc.)
4. **Feedback visual**: Indicação clara durante extração e após sucesso
5. **Consistência**: Mesma experiência do cadastro de clientes
