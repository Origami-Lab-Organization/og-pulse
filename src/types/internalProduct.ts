/** Um produto interno na tela Produtos (ADR-0049) — leitura de `internal_products_overview`. */
export interface InternalProductSummary {
  projectId: string;
  name: string;
  portfolioStage: string | null;
  /** Nome do GP do projeto, que é o responsável pelo produto; "não definido" sem GP. */
  managerName: string;
  /** Pessoas com alocação do mês corrente em diante. */
  teamSize: number;
  hoursTotal: number;
  hoursMonth: number;
  /** Nulo para quem não tem `financeiro:ler`: o banco não devolve o custo. */
  costTotal: number | null;
  costMonth: number | null;
  /** Primeira hora lançada — desde quando o produto recebe investimento. */
  firstHourOn: string | null;
  nextMilestone: { title: string; on: string | null } | null;
  lastRelease: { name: string; on: string | null } | null;
}
