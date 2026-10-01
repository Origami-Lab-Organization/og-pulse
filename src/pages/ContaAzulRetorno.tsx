import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFinishContaAzulConnection } from '@/hooks/useContaAzulConnection';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';

const INTEGRATIONS_PATH = '/admin/integracoes';

/**
 * Volta do Conta Azul depois da autorização (URL de retorno cadastrada no app do Pulse).
 * O código vale 3 minutos e o `state` é de uso único: a troca roda uma vez só, mesmo com o
 * efeito duplo do StrictMode.
 */
export default function ContaAzulRetorno() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const finish = useFinishContaAzulConnection();
  const started = useRef(false);
  const code = params.get('code');
  const state = params.get('state');

  useEffect(() => {
    if (started.current || !code || !state) return;
    started.current = true;
    finish.mutate(
      { code, state },
      {
        onSuccess: (connection) => {
          toast({
            title: 'Conta Azul conectado',
            description: connection.ca_trade_name || connection.ca_legal_name || undefined,
          });
          navigate(INTEGRATIONS_PATH, { replace: true });
        },
      },
    );
  }, [code, state, finish, navigate, toast]);

  const missing = !code || !state;
  const failed = missing || finish.isError;
  const message = missing
    ? 'O Conta Azul voltou sem a autorização. Pode ser que a conexão tenha sido cancelada.'
    : mensagemParaUsuario(finish.error, 'Não foi possível concluir a conexão com o Conta Azul.');

  return (
    <AppLayout
      title="Conectando ao Conta Azul"
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Integrações', href: INTEGRATIONS_PATH }, { label: 'Conta Azul' }]}
    >
      <Card className="max-w-xl">
        <CardContent className="flex flex-col items-start gap-4 pt-6">
          {failed ? (
            <>
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
              <Button asChild variant="outline">
                <Link to={INTEGRATIONS_PATH}>Voltar para Integrações</Link>
              </Button>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Confirmando a autorização com o Conta Azul…
            </p>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
