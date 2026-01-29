

# Plano: Formatar Textos Extraídos do Cartão CNPJ com Capitalização Correta

## Problema

Quando os dados são extraídos do Cartão CNPJ via IA, eles vêm em MAIÚSCULAS (como aparece no documento oficial), mas o usuário deseja que sejam exibidos com apenas a primeira letra de cada palavra em maiúsculo.

**Exemplo:**
- Atual: `PRUMO ENGENHARIA LTDA`
- Desejado: `Prumo Engenharia LTDA`

---

## Solução

Criar uma função utilitária `toTitleCase` que formata o texto corretamente, preservando siglas e abreviações comuns em nomes empresariais.

---

## Alterações Necessárias

### 1. Arquivo: `src/lib/formatters.ts`

Adicionar nova função `toTitleCase`:

```typescript
/**
 * Converte texto para Title Case, preservando siglas empresariais
 * Ex: "PRUMO ENGENHARIA LTDA" -> "Prumo Engenharia LTDA"
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  
  // Palavras que devem permanecer em MAIÚSCULO (siglas empresariais)
  const upperCaseWords = ['LTDA', 'S/A', 'SA', 'ME', 'EPP', 'EIRELI', 'SS', 'CNPJ', 'CPF'];
  
  // Palavras que devem permanecer em minúsculo
  const lowerCaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'com'];
  
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      const upperWord = word.toUpperCase();
      
      // Verificar se é uma sigla que deve ficar em maiúsculo
      if (upperCaseWords.includes(upperWord)) {
        return upperWord;
      }
      
      // Verificar se é uma palavra que deve ficar em minúsculo (exceto primeira palavra)
      if (index > 0 && lowerCaseWords.includes(word)) {
        return word;
      }
      
      // Capitalizar primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
```

### 2. Arquivo: `src/components/clients/ClientFormDialog.tsx`

Importar a função e aplicar nos campos extraídos:

```typescript
// Adicionar import
import { toTitleCase } from '@/lib/formatters';

// Na função handlePdfUpload, aplicar toTitleCase nos campos de texto:
if (data.razaoSocial) {
  form.setValue('companyName', toTitleCase(data.razaoSocial));
}
if (data.nomeFantasia) {
  form.setValue('tradingName', toTitleCase(data.nomeFantasia));
}
if (data.logradouro) {
  form.setValue('logradouro', toTitleCase(data.logradouro));
}
if (data.bairro) {
  form.setValue('bairro', toTitleCase(data.bairro));
}
if (data.cidade) {
  form.setValue('cidade', toTitleCase(data.cidade));
}
```

---

## Campos Afetados

| Campo | Antes | Depois |
|-------|-------|--------|
| Razão Social | `PRUMO ENGENHARIA LTDA` | `Prumo Engenharia LTDA` |
| Nome Fantasia | `PRUMO ENGENHARIA` | `Prumo Engenharia` |
| Logradouro | `RUA DAS FLORES` | `Rua das Flores` |
| Bairro | `CENTRO` | `Centro` |
| Cidade | `SAO PAULO` | `São Paulo` |

**Campos não afetados:**
- CNPJ (números)
- CEP (números)
- Número (numérico)
- Estado (mantém maiúsculo - 2 letras UF)

---

## Exemplos de Conversão

| Entrada | Saída |
|---------|-------|
| `PRUMO ENGENHARIA LTDA` | `Prumo Engenharia LTDA` |
| `COMERCIO DE ALIMENTOS SA` | `Comércio de Alimentos SA` |
| `JOAO DA SILVA ME` | `João da Silva ME` |
| `RUA DOS PIONEIROS` | `Rua dos Pioneiros` |
| `AVENIDA BRASIL` | `Avenida Brasil` |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/formatters.ts` | Adicionar função `toTitleCase` |
| `src/components/clients/ClientFormDialog.tsx` | Aplicar `toTitleCase` nos campos extraídos do PDF |

---

## Critérios de Aceite

1. Razão Social extraída aparece com capitalização correta
2. Nome Fantasia extraído aparece com capitalização correta
3. Campos de endereço (logradouro, bairro, cidade) aparecem com capitalização correta
4. Siglas empresariais (LTDA, ME, EPP, SA, etc.) permanecem em maiúsculo
5. Preposições (de, da, do, das, dos) ficam em minúsculo quando não são a primeira palavra
6. O preenchimento manual continua funcionando normalmente (sem alteração)

