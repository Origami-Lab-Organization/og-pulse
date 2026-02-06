
# Plano: Mover Meta de Margem Bruta para Seção Própria

## Problema Atual

O campo "Meta de Margem Bruta" está misturado com os percentuais de markup de orçamento (Despesas Administrativas, Impostos, Comissão, Margem Líquida), mas tem um propósito diferente - é uma meta para projetos, não um componente da fórmula de preço.

## Solução

Criar uma nova seção "Metas de Projeto" separada da seção "Percentuais para Orçamentos".

## Alteração

**Arquivo:** `src/components/settings/FinancialSettingsForm.tsx`

**Layout Atual:**
```text
┌────────────────────────────────────────────────────────────────────┐
│ % Percentuais para Orçamentos                                      │
│                                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ Desp. Admin  │ │ Impostos     │ │ Comissão     │ │ Margem Líq. │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│ ┌──────────────┐                                                   │
│ │ Meta Margem  │  <-- Misturado aqui                               │
│ └──────────────┘                                                   │
└────────────────────────────────────────────────────────────────────┘
```

**Layout Proposto:**
```text
┌────────────────────────────────────────────────────────────────────┐
│ % Percentuais para Orçamentos                                      │
│ Configure os percentuais padrão usados na fórmula de markup...    │
│                                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ Desp. Admin  │ │ Impostos     │ │ Comissão     │ │ Margem Líq. │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ 📈 Metas de Projeto                                                │
│ Configure as metas financeiras para acompanhamento de projetos    │
│                                                                    │
│ ┌──────────────┐                                                   │
│ │ Meta Margem  │                                                   │
│ │ Bruta        │                                                   │
│ └──────────────┘                                                   │
└────────────────────────────────────────────────────────────────────┘

                                            [Salvar Configurações]
```

## Implementacao

1. Mover o FormField de `gross_margin_target_percent` para fora do grid atual
2. Criar um novo Card com titulo "Metas de Projeto" e icone Target
3. Adicionar descricao explicando o proposito das metas
4. Mover o botao "Salvar Configuracoes" para fora dos cards (salva tudo junto)
5. Importar icone `Target` do lucide-react

## Resultado

- Separacao clara entre percentuais de markup e metas de acompanhamento
- Interface mais organizada e intuitiva
- Possibilidade de adicionar mais metas no futuro nessa mesma secao
