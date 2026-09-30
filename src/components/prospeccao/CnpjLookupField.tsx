import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCNPJ, validateCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import type { ReceitaSnapshot } from '@/types/receita';

interface CnpjLookupFieldProps {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  /** Chamado com o retrato da Receita; quem usa decide o que preencher e grava ao salvar. */
  onFound: (receita: ReceitaSnapshot) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * CNPJ com a busca na Receita ao lado (29/09/2026) — o mesmo do cadastro de contato, nas
 * edições de empresa. O botão só acende com CNPJ válido; a falha aparece embaixo do campo e
 * não bloqueia a edição manual.
 */
export function CnpjLookupField(props: CnpjLookupFieldProps) {
  const { id, value, onChange, onFound, disabled, className } = props;
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const digitos = value.replace(/\D/g, '');

  const consultar = async () => {
    setConsultando(true);
    setErro(null);
    try {
      onFound(await lookupCnpj(digitos));
    } catch (e) {
      setErro(e instanceof CnpjLookupError ? e.message : 'Não foi possível consultar o CNPJ.');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder="00.000.000/0000-00"
          onChange={(e) => {
            setErro(null);
            onChange(formatCNPJ(e.target.value));
          }}
          disabled={disabled}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className={cn(className)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Buscar dados do CNPJ na Receita"
          title="Buscar dados do CNPJ na Receita"
          disabled={disabled || consultando || !validateCNPJ(digitos)}
          onClick={consultar}
        >
          {consultando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
