

# Plano: Adicionar Campo Complemento no Endereço de Clientes

## Resumo

Adicionar o campo "Complemento" no cadastro e edição de clientes, permitindo informar dados adicionais do endereço como sala, andar, bloco, etc.

---

## Alteracoes Necessarias

### 1. Banco de Dados

Criar uma migration para adicionar a coluna `complemento` na tabela `clients`:

```sql
ALTER TABLE public.clients 
ADD COLUMN complemento text;
```

---

### 2. Tipos TypeScript

**Arquivo: `src/types/client.ts`**

Adicionar o campo `complemento` nas interfaces e na funcao de conversao:

| Interface | Campo a Adicionar |
|-----------|-------------------|
| `ClientDB` | `complemento: string \| null;` |
| `Client` | `complemento: string \| null;` |
| `CreateClientInput` | `complemento?: string;` |
| `dbToClient` | `complemento: db.complemento,` |

---

### 3. Formulario de Cliente

**Arquivo: `src/components/clients/ClientFormDialog.tsx`**

- Adicionar `complemento` no schema Zod
- Adicionar `complemento` nos valores default do formulario
- Adicionar `complemento` no reset do formulario (edicao e novo)
- Adicionar campo de input para Complemento entre Numero e Bairro

Layout proposto da secao de endereco:

```text
|  CEP  |     Logradouro      |
|Numero |    Complemento      |
|Bairro |  Cidade  |  Estado  |
```

---

### 4. Servico de Cliente

**Arquivo: `src/services/clientService.ts`**

Adicionar `complemento` nas funcoes:
- `create`: incluir `complemento: input.complemento || null`
- `update`: incluir tratamento para `complemento`

---

### 5. Edge Function (Extracao PDF)

**Arquivo: `supabase/functions/parse-cnpj-card/index.ts`**

Atualizar o prompt da IA para extrair tambem o complemento do Cartao CNPJ (se houver).

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `complemento` na tabela `clients` |
| `src/types/client.ts` | Adicionar campo `complemento` nas interfaces |
| `src/components/clients/ClientFormDialog.tsx` | Adicionar campo de input para Complemento |
| `src/services/clientService.ts` | Incluir `complemento` no create e update |
| `supabase/functions/parse-cnpj-card/index.ts` | Extrair complemento do PDF |

---

## Criterios de Aceite

1. Campo "Complemento" aparece no formulario de novo cliente
2. Campo "Complemento" aparece no formulario de edicao de cliente
3. Valor do complemento e salvo corretamente no banco de dados
4. Valor do complemento e carregado corretamente ao editar um cliente
5. Extracao do PDF preenche o complemento automaticamente (quando disponivel)

