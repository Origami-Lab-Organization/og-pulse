/**
 * Tom de cor do desvio de custo de mão de obra, seguindo os mesmos limiares
 * usados na aba Equipe: verde ≤100% · amarelo ≤110% · vermelho >110%.
 * Retorna classes de texto com tokens do tema (sem hex avulso).
 */
export function laborDeltaTextTone(realizedCost: number, plannedCost: number): string {
  if (plannedCost <= 0) {
    return realizedCost > 0 ? 'text-destructive' : 'text-muted-foreground';
  }
  const ratio = realizedCost / plannedCost;
  if (ratio <= 1) return 'text-primary-deep';
  if (ratio <= 1.1) return 'text-warning';
  return 'text-destructive';
}
