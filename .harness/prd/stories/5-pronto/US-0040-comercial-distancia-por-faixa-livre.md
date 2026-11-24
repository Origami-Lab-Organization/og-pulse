# US-0040 — Distância de Formiga escolhida pela pessoa

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 24/11/2026 (refinamento aprovado no pedido "refine a 40, 41 e 42 para desenvolvermos elas"; testes aprovados)
- **Relacionadas:** US-0003, US-0015, US-0041, US-0042

## Descrição

**Como** pessoa do comercial,
**quero** escolher a distância máxima de Formiga numa barra (ou digitando os km),
**para** recortar a região que faz sentido para a conta, e não só as faixas fixas.

### Contexto

Pedido do Victor (24/11/2026), validando a tela Empresas. Hoje o filtro "Distância de Formiga"
tem faixas fixas: qualquer, até 50, 100, 200, 300 ou 500 km (US-0015). A distância já está
calculada para cada empresa da Base (`distancia_km`, em linha reta até a sede do município).

Na Base (24/11/2026): a empresa mais distante está a 3.282 km; 77% (1,88 milhão de 2,44
milhões) ficam a até 1.000 km.

### Escopo

- Inclui: no grupo "Região" do painel de filtros da Base, no lugar das faixas fixas:
  - uma **barra deslizante** de 10 a 1.000 km, de 10 em 10;
  - ao lado, um **campo em km** que aceita de 1 a 3.300 (inteiro); acima de 1.000, a barra
    fica no fim e o campo mostra o valor digitado;
  - **"Qualquer"** limpa o filtro (valor 0, o mesmo de hoje).
- Inclui: o resumo do grupo mostra "até N km".
- Inclui: a lista só é pedida de novo quando a pessoa **solta a barra** ou **confirma o campo**
  (Enter ou sair do campo) — nunca a cada passo do arraste.
- Inclui: o filtro guardado no navegador aceita qualquer inteiro de 1 a 3.300; os guardados
  antigos (50, 100, 200, 300, 500) continuam valendo como estão.
- Inclui: o mesmo controle no filtro da aba "Em qualificação" (US-0042).
- Não inclui: distância por estrada ou tempo de viagem; distância mínima (faixa "de–até") —
  decidido em 24/11/2026: não agora.

## Critérios de aceite

**Cenário 1: escolher pela barra**

- **Quando** arrasto a barra até 180 km e solto;
- **Então** a lista mostra só empresas até 180 km de Formiga, o campo mostra "180" e o resumo,
  "até 180 km".

**Cenário 2: digitar**

- **Quando** digito 75 no campo e confirmo;
- **Então** a barra vai para 75 e a lista filtra até 75 km.

**Cenário 3: além da barra**

- **Quando** digito 2.000 no campo e confirmo;
- **Então** a barra fica no fim (1.000), o campo mostra "2000" e a lista filtra até 2.000 km.

**Cenário 4: valor fora do limite**

- **Quando** digito 0, 5.000 ou um texto e confirmo;
- **Então** o campo volta ao último valor válido e nada muda na lista.

**Cenário 5: limpar**

- **Quando** uso "Qualquer";
- **Então** o filtro de distância some, e a barra e o campo voltam ao início.

**Cenário 6: filtro guardado antes**

- **Dado** que eu tinha "até 200 km" guardado com as faixas antigas;
- **Quando** abro a tela;
- **Então** o filtro continua em 200 km, com a barra em 200.

**Cenário 7: pelo teclado**

- **Quando** foco a barra e uso as setas;
- **Então** a distância muda de 10 em 10 km, e a lista atualiza ao parar (mesma regra do soltar).

## Decisões (24/11/2026, Victor)

- Barra de 10 a 1.000 km, de 10 em 10; campo de 1 a 3.300 km.
- Sem distância mínima por enquanto.

## Contexto técnico

- **Comportamento atual:** PROVADO — opções fixas em `DISTANCIAS`
  (`src/lib/prospecting/filtrosReceita.ts`), validadas na Edge Function `empresas-receita`
  (`DISTANCIAS = new Set([0, 50, 100, 200, 300, 500])`); condição `e.distancia_km <= $n`
  (parâmetro); `lerFiltrosSalvos` aceita só os valores de `DISTANCIAS`.
- **Mudanças:**
  - `filtrosReceita.ts`: constantes `DISTANCIA_DA_BARRA` (10–1.000, passo 10) e
    `DISTANCIA_MAXIMA` (3.300); `lerFiltrosSalvos` aceita inteiro de 1 a 3.300.
  - Componente novo e reaproveitável (US-0042), ex. `DistanciaDeFormiga`, com o `Slider` de
    `src/components/ui/slider.tsx` (Radix: teclado e `aria-label` "Distância máxima de Formiga,
    em km") e um `Input` numérico rotulado; aplica em `onValueCommit` e no Enter/blur.
  - Edge Function: troca o conjunto fechado por "inteiro de 0 a 3.300" (0 = sem filtro); continua
    parâmetro, nunca SQL montado.
  - Sem mudança no banco; o índice de `distancia_km` já existe.
- **Restrições:** tokens do tema; foco visível; nomes Oportunidade/Pipeline.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 7 | validado pelo Victor no localhost em 24/11/2026 ("testei, tudo passou"), depois dos ajustes do primeiro teste; testes automatizados desativados |

- Regra: `DISTANCIA_DA_BARRA`, `DISTANCIA_MAXIMA`, `distanciaValida`, `rotuloDaDistancia`
  (`src/lib/prospecting/filtrosReceita.ts`); filtro guardado aceita inteiro de 1 a 3.300.
- Tela: `DistanciaDeFormiga` (`src/components/prospeccao/filtros/`), barra Radix e campo; aplica
  350 ms depois de soltar a barra ou parar nas setas, e no Enter/saída do campo.
- Edge Function `empresas-receita`: `lerDistancia` (inteiro de 0 a 3.300, parâmetro); publicada
  em 24/11/2026 antes do PR, compatível com a tela anterior.
