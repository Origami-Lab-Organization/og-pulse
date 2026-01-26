
# Plano: Landing Page Otimizada para SEO/AEO/GEO

## Objetivo
Criar uma Landing Page de alta conversao para o Origami Pulse, otimizada para motores de busca tradicionais (SEO), Answer Engines como ChatGPT/Perplexity (AEO), e Generative Engines (GEO).

## Estrutura da Landing Page

### 1. Componentes e Arquivos

**Arquivo principal:** `src/pages/LandingPage.tsx`

**Estrutura de secoes:**
- Hero Section (acima da dobra)
- Problema/Solucao (pain points)
- Funcionalidades principais (feature grid)
- Beneficios com numeros (social proof)
- CTA secundario
- FAQ (otimizado para AEO)
- Footer discreto com "Powered by OrigamiLab"

### 2. Otimizacoes SEO

- Tags semanticas HTML5 (main, section, article, aside)
- Heading hierarchy correto (h1 > h2 > h3)
- Meta tags dinamicas via React Helmet ou manual
- Alt text em todas as imagens
- Schema markup JSON-LD para SoftwareApplication
- URLs amigaveis
- Core Web Vitals (lazy loading, otimizacao de imagens)

### 3. Otimizacoes AEO (Answer Engine Optimization)

- FAQ Section estruturada com perguntas reais
- Conteudo em formato de pergunta-resposta
- Definicoes claras do produto
- Listas de funcionalidades facilmente parseaveeis
- Linguagem natural e conversacional

### 4. Otimizacoes GEO (Generative Engine Optimization)

- Conteudo autoritativo e factual
- Citacoes de beneficios com dados especificos
- Estrutura clara que LLMs podem resumir
- Evitar jargoes, ser direto
- Conteudo unico e diferenciado

### 5. Elementos de Alta Conversao

- CTA primario: "Comece Gratis" (link para /register)
- CTA secundario: "Faca Login" (link para /login)
- Proposta de valor clara no hero
- Urgencia sutil (sem ser agressivo)
- Trust signals (seguranca, multi-tenant)

## Conteudo da Landing Page

### Hero Section
**Headline:** "Gestao Financeira Completa para Empresas de Servicos"
**Subheadline:** "Controle funcionarios, projetos e orcamentos em um so lugar. Saiba exatamente quanto custa sua operacao e maximize sua margem de lucro."
**CTA:** "Cadastre sua Empresa Gratis"

### Funcionalidades em Destaque

1. **Gestao de Equipe**
   - Controle completo de funcionarios
   - Custos: salario + beneficios + encargos + ferramentas
   - Custo/hora real calculado automaticamente

2. **Gestao de Clientes**
   - Carteira de clientes organizada
   - Historico de projetos por cliente
   - Status e informacoes centralizadas

3. **Projetos e Alocacao**
   - Projetos fixos ou continuos
   - Alocacao de equipe por projeto
   - Margem real vs contratada

4. **Orcamentos Profissionais**
   - Propostas comerciais detalhadas
   - Roles e horas por mes
   - Taxas, impostos e descontos automaticos

5. **Controle Financeiro**
   - Parcelas e recebimentos
   - Dashboard de margem
   - Visao clara de rentabilidade

6. **Multi-Empresa**
   - Ambiente isolado por empresa
   - Seguranca e privacidade
   - Cadastro self-service

### FAQ Section (AEO Optimized)

1. "O que e o Origami Pulse?"
2. "Para quem e indicado o Origami Pulse?"
3. "Como calcular o custo real de um funcionario?"
4. "Posso criar orcamentos comerciais?"
5. "O sistema e seguro para minha empresa?"
6. "Como comeco a usar?"

### Footer
- Links: Login | Cadastrar Empresa
- Redes sociais (opcional, placeholders)
- "Powered by OrigamiLab" (discreto, fonte menor, cor muted)

## Rotas e Navegacao

**Nova rota:** `/landing` ou raiz `/` para usuarios nao autenticados

**Logica:**
- Usuario nao autenticado -> Landing Page
- Usuario autenticado -> Dashboard (comportamento atual)

OU

- Criar rota `/landing` separada
- Manter `/` como dashboard protegido

**Recomendacao:** Criar em `/landing` para nao quebrar fluxo atual, depois pode-se ajustar.

## Detalhes Tecnicos

### Estrutura do Componente

```text
LandingPage.tsx
|
+-- HeroSection
|   +-- Logo
|   +-- Headline (h1)
|   +-- Subheadline
|   +-- CTA Button -> /register
|   +-- Secondary Link -> /login
|
+-- ProblemSection
|   +-- Pain points das empresas
|
+-- FeaturesSection
|   +-- Grid de 6 funcionalidades
|   +-- Icones + titulo + descricao
|
+-- BenefitsSection
|   +-- Numeros/estatisticas
|   +-- Trust signals
|
+-- FAQSection
|   +-- Accordion com 6 perguntas
|   +-- Schema markup para FAQ
|
+-- CTASection
|   +-- CTA final de conversao
|
+-- Footer
|   +-- Links navegacao
|   +-- Powered by OrigamiLab
```

### Schema Markup (JSON-LD)

```typescript
const schemaData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Origami Pulse",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "BRL"
  },
  "description": "Sistema de gestao financeira para empresas de servicos"
};
```

### Meta Tags (index.html)

```html
<title>Origami Pulse - Gestao Financeira para Empresas de Servicos</title>
<meta name="description" content="Controle funcionarios, projetos e orcamentos. Calcule custos reais e maximize sua margem de lucro." />
<meta name="keywords" content="gestao financeira, controle de custos, orcamentos, projetos, funcionarios" />
```

## Arquivos a Criar/Modificar

1. **Criar:** `src/pages/LandingPage.tsx` - Pagina principal
2. **Modificar:** `src/App.tsx` - Adicionar rota /landing
3. **Modificar:** `index.html` - Meta tags SEO

## Design e Estilo

- Seguir paleta verde existente (primary, secondary, accent)
- Usar componentes UI existentes (Button, Card, Accordion)
- Layout responsivo (mobile-first)
- Animacoes sutis com CSS (fade-in nas secoes)
- Imagens/ilustracoes podem ser placeholders ou icones Lucide
