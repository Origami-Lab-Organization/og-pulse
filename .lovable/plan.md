

## Exibir Linha de Servico nos Cartoes

### Situacao atual
- **CRM**: O cartao do lead ja exibe a linha de servico (implementado anteriormente)
- **Portfolio**: O cartao do projeto **nao** exibe a linha de servico, e o campo nem e buscado do banco

### Alteracoes necessarias

**1. `src/hooks/usePortfolioProjects.ts`**
- Adicionar `service_line?: string` na interface `PortfolioProject`
- Incluir `service_line` na query do Supabase (no `.select(...)`)

**2. `src/components/portfolio/PortfolioCard.tsx`**
- Importar `SERVICE_LINE_LABELS` de `src/types/lead.ts` e o icone `Layers`
- Exibir a linha de servico como texto discreto abaixo do cliente/gerente (mesmo estilo do cartao CRM)

Nenhuma alteracao no CRM, pois ja esta implementado.
