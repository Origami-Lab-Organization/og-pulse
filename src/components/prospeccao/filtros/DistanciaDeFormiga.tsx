import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { DISTANCIA_DA_BARRA, distanciaValida } from '@/lib/prospecting/filtrosReceita';
import { cn } from '@/lib/utils';
import { CHIP, CHIP_LIVRE, CHIP_MARCADO } from './BlocosDeFiltro';

/** Espera depois de soltar a barra ou parar nas setas, para não pedir a lista a cada passo. */
const ESPERA_MS = 350;
const TECLA_DE_CONFIRMAR = 'Enter';

const naBarra = (km: number) => Math.min(Math.max(km, DISTANCIA_DA_BARRA.minimo), DISTANCIA_DA_BARRA.maximo);
const textoDe = (km: number) => (km > 0 ? String(km) : '');

/**
 * Distância máxima de Formiga (US-0040): barra de 10 a 1.000 km, de 10 em 10, e campo que aceita
 * de 1 a 3.300 km. A lista só muda ao soltar a barra (ou parar nas setas) e ao confirmar o campo
 * (Enter ou sair dele). Valor inválido no campo volta ao último válido. 0 = qualquer.
 */
export function DistanciaDeFormiga({ valor, onMudar }: { valor: number; onMudar: (km: number) => void }) {
  const campo = useId();
  const [barra, setBarra] = useState(naBarra(valor));
  const [texto, setTexto] = useState(textoDe(valor));
  const espera = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setBarra(naBarra(valor));
    setTexto(textoDe(valor));
  }, [valor]);
  useEffect(() => () => clearTimeout(espera.current), []);

  const aplicar = (km: number) => {
    clearTimeout(espera.current);
    if (km !== valor) onMudar(km);
  };

  const confirmarTexto = () => {
    const km = Number(texto.trim());
    if (distanciaValida(km)) aplicar(km);
    else setTexto(textoDe(valor));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        aria-pressed={valor === 0}
        onClick={() => aplicar(0)}
        className={cn(CHIP, 'self-start', valor === 0 ? CHIP_MARCADO : CHIP_LIVRE)}
      >
        Qualquer
      </button>
      <div className="flex items-center gap-3">
        <Slider
          aria-label="Distância máxima de Formiga, em km"
          min={DISTANCIA_DA_BARRA.minimo}
          max={DISTANCIA_DA_BARRA.maximo}
          step={DISTANCIA_DA_BARRA.passo}
          value={[barra]}
          onValueChange={([km]) => {
            setBarra(km);
            setTexto(String(km));
          }}
          onValueCommit={([km]) => {
            clearTimeout(espera.current);
            espera.current = setTimeout(() => aplicar(km), ESPERA_MS);
          }}
          className={cn('flex-1', valor === 0 && 'opacity-60')}
        />
        <div className="flex shrink-0 items-center gap-1">
          <label htmlFor={campo} className="sr-only">Distância máxima de Formiga, em km</label>
          <Input
            id={campo}
            inputMode="numeric"
            autoComplete="off"
            placeholder="km"
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === TECLA_DE_CONFIRMAR) confirmarTexto();
            }}
            onBlur={confirmarTexto}
            className="h-8 w-[4.5rem] text-right text-[13px] tabular-nums"
          />
          <span className="text-[12.5px] text-muted-foreground" aria-hidden="true">km</span>
        </div>
      </div>
    </div>
  );
}
