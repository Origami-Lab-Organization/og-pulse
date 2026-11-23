import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { amanha, dataDaVolta, PRAZO_PADRAO, PRAZOS_DO_NAO_AGORA } from '@/lib/prospecting/decisoesDaBase';
import { formatarData } from '@/lib/prospecting/prazos';

interface CampoVoltarEmProps {
  /** A data escolhida (AAAA-MM-DD), ou nulo enquanto a data livre não for válida. */
  onChange: (voltarEm: string | null) => void;
  desabilitado?: boolean;
}

const DATA_LIVRE = 'data';

/**
 * "Voltar em" do "Não agora" (US-0010): 3, 6 ou 12 meses, ou uma data a partir de amanhã. O
 * padrão é 3 meses (os 90 dias de 16/11/2026). Usado na Base de empresas e na Perda "Momento
 * errado".
 */
export function CampoVoltarEm(props: CampoVoltarEmProps) {
  const { onChange, desabilitado = false } = props;
  const id = useId();
  const [prazo, setPrazo] = useState(String(PRAZO_PADRAO));
  const [data, setData] = useState('');
  const livre = prazo === DATA_LIVRE;

  useEffect(() => {
    const escolhida = livre ? data : dataDaVolta(Number(prazo));
    onChange(escolhida && escolhida >= amanha() ? escolhida : null);
  }, [livre, data, prazo, onChange]);

  return (
    <fieldset className="space-y-2" disabled={desabilitado}>
      <legend className="mb-2 text-sm font-medium">Voltar em</legend>
      <RadioGroup value={prazo} onValueChange={setPrazo} className="gap-2">
        {PRAZOS_DO_NAO_AGORA.map((p) => (
          <div key={p.valor} className="flex items-center gap-2">
            <RadioGroupItem id={`${id}-${p.valor}`} value={String(p.valor)} />
            <Label htmlFor={`${id}-${p.valor}`} className="font-normal">
              {p.rotulo} <span className="text-muted-foreground">· {formatarData(dataDaVolta(p.valor))}</span>
            </Label>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-${DATA_LIVRE}`} value={DATA_LIVRE} />
          <Label htmlFor={`${id}-${DATA_LIVRE}`} className="font-normal">Escolher a data</Label>
        </div>
      </RadioGroup>
      {livre && (
        <Input
          type="date"
          aria-label="Data para voltar"
          className="mt-1 w-48"
          min={amanha()}
          value={data}
          onChange={(e) => setData(e.target.value)}
          autoFocus
        />
      )}
    </fieldset>
  );
}
