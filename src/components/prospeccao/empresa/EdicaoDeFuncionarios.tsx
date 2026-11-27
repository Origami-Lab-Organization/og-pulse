import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFuncionariosDoTime } from '@/hooks/useEstudoDaConta';
import { useFaixaDeFuncionarios } from '@/hooks/usePaginaDaEmpresa';
import { FAIXAS_DO_LINKEDIN, type FaixaDoLinkedin } from '@/lib/prospecting/funcionarios.constants';
import { inteiroDoTexto } from '@/lib/prospecting/paginaDaEmpresa';
import { cn } from '@/lib/utils';
import type { ProspectCompanyDB } from '@/types/prospect';

interface EdicaoDeFuncionariosProps {
  empresa: ProspectCompanyDB;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  /** "Informar" ou "Corrigir". */
  textoDoBotao: string;
}

function Faixas({ atual, onEscolher }: { atual: string | null; onEscolher: (f: FaixaDoLinkedin) => void }) {
  return (
    <div role="group" aria-label="Faixa do LinkedIn" className="grid grid-cols-3 gap-1">
      {FAIXAS_DO_LINKEDIN.map((f) => (
        <button
          key={f.valor}
          type="button"
          aria-pressed={atual === f.valor}
          onClick={() => onEscolher(f.valor)}
          className={cn(
            'rounded-md border px-2 py-1.5 text-[12.5px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            atual === f.valor && 'border-primary bg-primary/10 text-primary',
          )}
        >
          {f.rotulo}
        </button>
      ))}
    </div>
  );
}

/**
 * Funcionários que o time sabe (US-0020, US-0054): a faixa do LinkedIn ou o número exato. Um
 * substitui o outro; "Voltar à RAIS" apaga os dois.
 */
export function EdicaoDeFuncionarios(props: EdicaoDeFuncionariosProps) {
  const { empresa, aberto, onAbertoChange, textoDoBotao } = props;
  const exato = useFuncionariosDoTime();
  const faixa = useFaixaDeFuncionarios();
  const [numero, setNumero] = useState(empresa.funcionarios_informados != null ? String(empresa.funcionarios_informados) : '');
  const doTime = empresa.funcionarios_informados != null || empresa.funcionarios_faixa != null;
  const fechar = () => onAbertoChange(false);
  const salvarNumero = (e: React.FormEvent) => {
    e.preventDefault();
    const n = inteiroDoTexto(numero);
    if (n != null) exato.mutate({ companyId: empresa.id, funcionarios: n }, { onSuccess: fechar });
  };
  return (
    <Popover open={aberto} onOpenChange={onAbertoChange}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-sm text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Pencil className="h-3 w-3" aria-hidden="true" />
          {textoDoBotao}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] space-y-3 p-3.5">
        <p className="ui-label">Faixa do LinkedIn</p>
        <Faixas atual={empresa.funcionarios_faixa ?? null} onEscolher={(f) => faixa.mutate({ id: empresa.id, faixa: f }, { onSuccess: fechar })} />
        <form onSubmit={salvarNumero} className="space-y-1.5 border-t pt-3">
          <label htmlFor="funcionarios-exato" className="ui-label">Número exato</label>
          <div className="flex gap-2">
            <Input id="funcionarios-exato" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: 760" className="h-8" />
            <Button type="submit" size="sm" className="h-8" disabled={inteiroDoTexto(numero) == null || exato.isPending}>Salvar</Button>
          </div>
        </form>
        {doTime && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-0 text-[12.5px] text-muted-foreground" onClick={() => exato.mutate({ companyId: empresa.id, funcionarios: null }, { onSuccess: fechar })}>
            Voltar à RAIS
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
