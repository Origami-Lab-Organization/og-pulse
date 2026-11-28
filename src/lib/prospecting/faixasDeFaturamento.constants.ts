/**
 * Faixas fixas do faturamento estimado (US-0056, decisão do Victor de 26/11/2026: "faixas do
 * tamanho do Econodata"). Os cortes em R$ 10, 100 e 300 mi são os do filtro (`FATURAMENTOS`): a
 * faixa da tela cabe sempre numa faixa do filtro. Da maior para a menor; vale a primeira em que o
 * valor chega ao piso.
 */
export const FAIXAS_DE_FATURAMENTO: ReadonlyArray<{ piso: number; rotulo: string }> = [
  { piso: 1_000_000_000, rotulo: 'acima de R$ 1 bi' },
  { piso: 500_000_000, rotulo: 'R$ 500 mi a 1 bi' },
  { piso: 300_000_000, rotulo: 'R$ 300 a 500 mi' },
  { piso: 200_000_000, rotulo: 'R$ 200 a 300 mi' },
  { piso: 100_000_000, rotulo: 'R$ 100 a 200 mi' },
  { piso: 50_000_000, rotulo: 'R$ 50 a 100 mi' },
  { piso: 30_000_000, rotulo: 'R$ 30 a 50 mi' },
  { piso: 10_000_000, rotulo: 'R$ 10 a 30 mi' },
  { piso: 4_800_000, rotulo: 'R$ 4,8 a 10 mi' },
  { piso: 0, rotulo: 'até R$ 4,8 mi' },
];

/** Faixas dos funcionários estimados: as do filtro da Base (US-0056). Da maior para a menor. */
export const FAIXAS_DE_FUNCIONARIOS: ReadonlyArray<{ piso: number; rotulo: string }> = [
  { piso: 500, rotulo: '500 ou mais' },
  { piso: 250, rotulo: '250 a 499' },
  { piso: 100, rotulo: '100 a 249' },
  { piso: 50, rotulo: '50 a 99' },
  { piso: 20, rotulo: '20 a 49' },
  { piso: 0, rotulo: 'até 19' },
];
