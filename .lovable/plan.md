

# Plano: Remover Spinners de Inputs Numéricos

## Problema

Os campos de input do tipo número (`type="number"`) exibem setas (spinners) para incrementar/decrementar o valor, mas o usuário prefere apenas digitar os números diretamente.

---

## Solução

Adicionar regra CSS global no arquivo `src/index.css` para remover os spinners de todos os inputs numéricos do sistema de uma só vez.

---

## Alteração

### Arquivo: `src/index.css`

Adicionar após a linha 121 (dentro do `@layer base`):

```css
/* Remove spinners from number inputs */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

---

## Detalhes Técnicos

| Regra CSS | Navegador | Efeito |
|-----------|-----------|--------|
| `::-webkit-outer-spin-button` | Chrome, Safari, Edge | Remove spinner externo |
| `::-webkit-inner-spin-button` | Chrome, Safari, Edge | Remove spinner interno |
| `-moz-appearance: textfield` | Firefox | Remove spinner |
| `appearance: textfield` | Padrão W3C | Fallback para outros navegadores |

---

## Campos Afetados

Esta alteração global afetará automaticamente todos os campos numéricos:

- Duração (meses) em orçamentos
- Horas por mês em projetos e orçamentos
- Valores monetários (materiais, fornecedores)
- Percentuais (comissão, margem, desconto)
- Quantidade de parcelas
- Dia de vencimento
- Horas mensais de funcionários

---

## Resultado Esperado

Todos os inputs numéricos do sistema terão apenas o campo de texto, sem as setas de incremento/decremento, proporcionando uma experiência mais limpa e consistente.

