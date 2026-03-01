

# Melhoria do Card "Motivos de Perda"

## O que muda

### 1. Empty State com icone e link para o CRM (`LossReasonsChart.tsx`)
Quando `data.length === 0`, exibir:
- Icone ilustrativo (Archive ou ShieldX do Lucide)
- Texto "Nenhum lead arquivado no periodo"
- Botao/link "Ir para o CRM" que navega para `/crm`

### 2. Grafico com percentuais (`LossReasonsChart.tsx`)
Quando ha dados:
- Manter o grafico de barras horizontais (ja existente)
- Adicionar coluna de percentual calculado: `(count / total) * 100`
- Exibir no LabelList o formato: `count (XX%)`
- Tooltip tambem mostra a porcentagem

### 3. Validacao do campo "Motivo" no arquivamento
O dialog `ArchiveLeadDialog.tsx` ja possui o campo "Motivo" como obrigatorio (botao desabilitado sem selecao) e usa as opcoes predefinidas de `ARCHIVE_REASONS`. A opcao "Outro" ja existe na lista. Nenhuma alteracao necessaria neste componente.

## Detalhes tecnicos

**Arquivo:** `src/components/commercial/LossReasonsChart.tsx`

**Empty state:**
- Importar `Archive` do lucide-react e `Link` do react-router-dom
- Substituir o paragrafo simples por um layout centralizado com icone, texto e link

**Grafico com percentuais:**
- Calcular `total = data.reduce((s, d) => s + d.count, 0)`
- Enriquecer dados com campo `percent`
- Usar LabelList customizado para exibir `count (XX%)`

Nenhuma alteracao no banco de dados e necessaria.
