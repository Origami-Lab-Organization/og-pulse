import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * O que o front decide mostrar depende de `my_capabilities`. Quando essa consulta não
 * responde, a interface fica menor do que deveria — menos abas, menos menu — e sem
 * aviso isso é indistinguível de "essa pessoa não tem acesso a isso".
 *
 * Foi exatamente o que se viu no deploy de PUL-206: admin abrindo projeto e enxergando
 * duas abas. O aviso existe para que a próxima vez seja legível, com retentativa à mão.
 */
export function CapabilitiesUnavailableBanner() {
  const { capabilitiesUnavailable, refreshEmployee } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!capabilitiesUnavailable) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await refreshEmployee();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm text-foreground"
    >
      <ShieldAlert className="h-4 w-4 text-warning" />
      <span>
        Não foi possível confirmar suas permissões. Parte do sistema pode estar oculta.
      </span>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-60"
      >
        {retrying ? 'Verificando…' : 'Tentar de novo'}
      </button>
    </div>
  );
}
