

## Plano: Desabilitar registro de novos tenants

### Abordagem
Solução simples e reversível: redirecionar a rota `/register` para `/login` e remover links de registro da landing page e login.

### Mudanças

**1. `src/App.tsx`**
- Trocar a rota `/register` de `<Register />` para `<Navigate to="/login" replace />`

**2. `src/pages/Login.tsx`**
- Remover o link "Criar conta" / "Registre-se" que aponta para `/register`

**3. `src/pages/LandingPage.tsx`**
- Remover ou esconder botões CTA de "Criar conta" / "Começar grátis" que apontam para `/register`

Quando o produto estiver pronto, basta reverter essas 3 mudanças.

