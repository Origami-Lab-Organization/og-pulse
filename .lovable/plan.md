

## Plano: Ajustar menu superior — ordem e permissões

### Mudanças em `src/components/layout/AppNavbar.tsx`

1. **Reordenar grupos**: Marketing vem após "Meu Espaço", antes de "Comercial"

2. **Permissões por grupo**:
   - **Meu Espaço**: todos (sem restrição)
   - **Marketing**: todos (sem restrição)
   - **Comercial**: `requiresManager: true` (gerentes de projeto + admins)
   - **Gestão de Projetos**: `requiresManager: true` (gerentes de projeto + admins)
   - **RH**: `requiresAdmin: true` (apenas admins)

3. **Ordem final**: Meu Espaço → Marketing → Comercial → Gestão de Projetos → RH

### Arquivo alterado
- `src/components/layout/AppNavbar.tsx`

