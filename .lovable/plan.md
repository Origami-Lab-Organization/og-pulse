

## Simplificacao da Pagina de Analise de Mercado

### Problema
A pagina tem uma sessao duplicada: o AppLayout ja renderiza "Analise de Mercado" como titulo, e dentro do conteudo ha outra sessao "Biblioteca de Analises". Alem disso, existem botoes "Voltar" redundantes com os breadcrumbs, o botao de analise completa tem texto desnecessario e os titulos dos modulos estao em ingles.

### Mudancas

**1. Unificar header usando AppLayout actions**
- Remover o header interno da "Biblioteca de Analises" (h1 + botao Nova Analise) do step `library`
- Mover o botao "Nova Analise" para a prop `actions` do AppLayout, visivel apenas quando `currentStep === 'library'`
- O titulo "Analise de Mercado" e descricao ja vem do AppLayout

**2. Remover todos os botoes "Voltar"**
- Step `selection`: remover o botao "Voltar para Biblioteca"
- Step `form`: remover o botao com ArrowLeft ao lado do titulo do modulo
- Step `result`: remover o botao "Biblioteca" com ArrowLeft
- A navegacao sera feita pelos breadcrumbs, que ja permitem clicar para voltar

**3. Tornar breadcrumbs clicaveis**
- "Marketing" sera apenas texto (sem link, ja que nao ha pagina de marketing generica)
- "Analise de Mercado" tera `href` para voltar ao step `library` quando estiver em steps internos
- O step atual (Selecao, Formulario, etc.) sera o ultimo item sem link

**4. Botao "Analise Completa" sem mencionar modulos**
- Mudar de `Analise Completa (Modulos 1 ao 12)` para apenas `Analise Estrategica Completa`

**5. Traduzir titulos dos modulos para portugues**
- Substituir os `title` dos modulos:

| Atual (Ingles) | Novo (Portugues) |
|---|---|
| Market Sizing & TAM Analysis | Dimensionamento de Mercado e TAM |
| Competitive Landscape Deep Dive | Panorama Competitivo |
| Customer Persona & Segmentation | Persona e Segmentacao de Clientes |
| Industry Trend Analysis | Analise de Tendencias do Setor |
| SWOT + Porter's Five Forces | SWOT e 5 Forcas de Porter |
| Pricing Strategy Analysis | Estrategia de Precificacao |
| Go-To-Market Strategy | Estrategia Go-To-Market |
| Customer Journey Mapping | Mapeamento da Jornada do Cliente |
| Financial Modeling & Unit Economics | Modelagem Financeira e Unit Economics |
| Risk Assessment & Scenario Planning | Avaliacao de Riscos e Cenarios |
| Market Entry & Expansion Strategy | Estrategia de Entrada e Expansao |
| Executive Strategy Synthesis | Sintese Estrategica Executiva |

### Detalhes tecnicos

**Arquivo modificado:** `src/pages/marketing/MarketAnalysisPage.tsx`

- O array `modules` tera os `title` atualizados para portugues
- O `AppLayout` recebera `actions` condicionalmente com o botao "Nova Analise" quando no step `library`
- Os breadcrumbs serao ajustados: quando `currentStep !== 'library'`, o item "Analise de Mercado" tera um `href` que dispara a volta ao step library (via onClick handler, nao navegacao real de rota)
- Como breadcrumbs usam `href` e nao `onClick`, sera necessario usar um handler no breadcrumb ou ajustar para que o clique em "Analise de Mercado" resete o estado para `library`
- Nenhuma outra pagina ou componente sera alterado

