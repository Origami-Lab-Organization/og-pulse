import { fitDaBase, linhaParaFit } from '@/lib/prospecting/fitDaBase';
import { SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import { Cartao, Secao } from './PecasDaPagina';

/** Fit por serviço em duas colunas, com a nota em barra e o motivo principal (US-0053). */
export function SecaoQualificacao({ empresa }: { empresa: EmpresaDaFicha }) {
  const fits = [...(fitDaBase(linhaParaFit(empresa), new Date().toISOString().slice(0, 10)) ?? [])].sort((a, b) => b.nota - a.nota);
  return (
    <Secao id={SECAO_DA_EMPRESA.QUALIFICACAO} titulo="Qualificação">
      <Cartao>
        <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Fit por serviço</h3>
        <ul className="grid gap-x-7 gap-y-3.5 sm:grid-cols-2">
          {fits.map((f) => (
            <li key={f.frente} className="min-w-0">
              <p className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="font-medium">{f.rotulo}</span>
                <span className="font-mono font-semibold tabular-nums">{f.nota}</span>
              </p>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, f.nota)}%` }} />
              </span>
              {f.motivos.length > 0 && (
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground" title={f.motivos.map((m) => m.texto).join(' · ')}>
                  {f.motivos.map((m) => m.texto).join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Cartao>
    </Secao>
  );
}
