
# Correção: Logo não sendo salva/exibida para Clientes e Fornecedores

## Diagnóstico

Após análise detalhada, identifiquei os seguintes problemas:

1. **Arquivo no storage existe**: O arquivo `clients/client-150a61d9-f322-4b29-bf99-ed526e17c23d-1770328659106.png` foi carregado com sucesso no bucket `company-logos`.

2. **Banco de dados não foi atualizado**: O campo `logo_url` da tabela `clients` para o cliente "Bry" está `null` e o `updated_at` ainda mostra a data de criação original (29/01/2026), indicando que nenhuma atualização foi salva.

3. **Problema de sincronização no `LogoUpload`**: O componente não sincroniza o estado interno `previewUrl` quando a prop `currentLogoUrl` muda. Isso pode causar comportamento inconsistente ao abrir o diálogo de edição.

## Causa Provável

O upload da logo foi feito com sucesso, mas o botão "Salvar" não foi clicado após o upload, então a URL nunca foi persistida no banco de dados.

## Correções Necessárias

### 1. Adicionar `useEffect` no `LogoUpload` para sincronizar estado

**Arquivo:** `src/components/ui/logo-upload.tsx`

Adicionar sincronização do estado quando a prop muda:

```tsx
import { useState, useRef, useEffect } from 'react';

// ... dentro do componente:

useEffect(() => {
  setPreviewUrl(currentLogoUrl || null);
}, [currentLogoUrl]);
```

Isso garante que quando o diálogo abre com um cliente existente que já tem logo, o preview será exibido corretamente.

### 2. Atualizar manualmente a logo do Bry no banco

Enquanto a correção não é aplicada, podemos atualizar a URL da logo diretamente:

```sql
UPDATE clients 
SET logo_url = 'https://vkriobpmolgopbbpqeky.supabase.co/storage/v1/object/public/company-logos/clients/client-150a61d9-f322-4b29-bf99-ed526e17c23d-1770328659106.png'
WHERE id = '150a61d9-f322-4b29-bf99-ed526e17c23d';
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/logo-upload.tsx` | Adicionar `useEffect` para sincronizar `previewUrl` com `currentLogoUrl` |

## Resultado Esperado

1. A logo do cliente "Bry" aparecerá na listagem após a correção no banco
2. O componente `LogoUpload` funcionará corretamente em edições futuras
3. Ao abrir um cliente para edição, a logo existente será exibida no preview
