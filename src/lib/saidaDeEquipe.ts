/**
 * Saída da equipe de um projeto (`project_team_rows.status = 'deallocated'`).
 *
 * A regra é uma só e vale para as DUAS telas que abrem linha de lançamento: a timesheet da
 * própria pessoa (grade semanal) e a que o gestor abre pela alocação. Estava escrita apenas
 * na primeira — por isso quem saía do projeto sumia da sua própria tela mas continuava com a
 * linha aberta na visão do gestor, convidando a lançar hora em projeto do qual já não é mais
 * da equipe.
 */
export interface SaidaDeEquipe {
  /** A pessoa saiu da equipe deste projeto. */
  isDeallocated?: boolean;
  /** Dia da saída (yyyy-MM-dd). Até ele a pessoa ainda pode lançar o que trabalhou. */
  deallocatedAt?: string | null;
}

/**
 * A semana inteira é posterior à saída — nenhum dia dela foi trabalhado na equipe.
 *
 * Sem data de saída não dá para saber até quando o vínculo valia; trata-se como fora da
 * equipe, que é o lado seguro.
 */
export function semanaPosteriorASaida(saida: SaidaDeEquipe, weekStart: string): boolean {
  if (!saida.isDeallocated) return false;
  if (!saida.deallocatedAt) return true;
  return weekStart > saida.deallocatedAt;
}

/**
 * A linha do projeto aparece na semana?
 *
 * Fica visível enquanto a semana tocar o tempo em que a pessoa era da equipe (quem sai numa
 * quarta ainda tem segunda e terça para apontar — PUL-182), ou enquanto houver hora já
 * lançada nela: apagar da tela hora gravada é pior do que mostrar uma linha travada.
 */
export function linhaDeProjetoVisivelNaSemana(
  saida: SaidaDeEquipe,
  weekStart: string,
  temHoraLancadaNaSemana: boolean,
): boolean {
  if (!semanaPosteriorASaida(saida, weekStart)) return true;
  return temHoraLancadaNaSemana;
}

/** Datas da semana que a saída trava: do dia seguinte à saída em diante. */
export function diasTravadosPelaSaida(saida: SaidaDeEquipe, datas: string[]): string[] {
  if (!saida.isDeallocated) return [];
  const saiuEm = saida.deallocatedAt;
  return datas.filter((data) => !saiuEm || data > saiuEm);
}
