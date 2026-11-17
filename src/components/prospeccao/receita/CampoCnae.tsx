import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCnaesReceita } from '@/hooks/useEmpresasReceita';
import { comecoDeCnae, rotuloDoCnae } from '@/lib/prospecting/filtrosReceita';

interface CampoCnaeProps {
  valores: string[];
  onChange: (valores: string[]) => void;
}

/**
 * CNAE por código, inteiro ou parcial ("2062"), ou por palavra da descrição ("fertilizante").
 * Os escolhidos somam (US-0003). A busca na tabela da CNAE é da Edge Function.
 */
export function CampoCnae({ valores, onChange }: CampoCnaeProps) {
  const id = useId();
  const [termo, setTermo] = useState('');
  const busca = useCnaesReceita(useDebouncedValue(termo, 300));
  const comeco = comecoDeCnae(termo);
  const resultados = termo.trim().length >= 2 ? (busca.data ?? []) : [];

  const escolher = (codigo: string) => {
    if (!valores.includes(codigo)) onChange([...valores, codigo]);
    setTermo('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] text-muted-foreground">CNAE ou descrição</label>
      <Input
        id={id}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Ex.: 2062 ou fertilizante"
        autoComplete="off"
        className="h-8 text-[13px]"
      />
      {termo.trim().length >= 2 && (
        <ul className="max-h-56 overflow-auto rounded-md border bg-popover text-[12.5px]" aria-label="CNAEs encontrados">
          {comeco && comeco.length < 7 && (
            <li>
              <OpcaoDeCnae onClick={() => escolher(comeco)} codigo={`Começa com ${comeco}`} descricao="todos os CNAEs com esse começo" />
            </li>
          )}
          {resultados.map((c) => (
            <li key={c.codigo}>
              <OpcaoDeCnae onClick={() => escolher(c.codigo)} codigo={rotuloDoCnae(c.codigo)} descricao={c.descricao} />
            </li>
          ))}
          {!busca.isFetching && resultados.length === 0 && !comeco && (
            <li className="px-2.5 py-2 text-muted-foreground">Nenhum CNAE com esse texto.</li>
          )}
          {busca.isError && <li className="px-2.5 py-2 text-muted-foreground">Não deu para buscar agora.</li>}
        </ul>
      )}
      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valores.map((codigo) => (
            <span key={codigo} className="inline-flex items-center gap-1 rounded-full border border-primary bg-accent-subtle py-0.5 pl-2.5 pr-1 font-mono text-[12px] text-success-emphasis">
              {rotuloDoCnae(codigo)}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tirar o CNAE ${rotuloDoCnae(codigo)}`}
                onClick={() => onChange(valores.filter((v) => v !== codigo))}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function OpcaoDeCnae({ codigo, descricao, onClick }: { codigo: string; descricao: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-2 px-2.5 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <span className="shrink-0 font-mono text-muted-foreground">{codigo}</span>
      <span className="line-clamp-2">{descricao}</span>
    </button>
  );
}
