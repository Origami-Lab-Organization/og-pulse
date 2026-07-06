import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck, Send, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

// FUNC-J1 — Tela de reenvio do convite de primeiro acesso.
// Acessada quando o login falha para um e-mail com convite pendente (must_change_password=true).
// NÃO permite definir senha aqui — apenas reenviar o e-mail de primeiro acesso.
const ReenviarPrimeiroAcesso = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get('email') ?? '';
  const [isSending, setIsSending] = useState(false);
  // Ao chegar da tela de login (que já dispara o envio), inicia no estado "enviado".
  const [sent, setSent] = useState(searchParams.get('sent') === '1');

  const handleResend = async () => {
    setIsSending(true);

    // A função é pública e responde sempre de forma genérica (não revela se a
    // conta existe). Por isso tratamos sucesso de UX independente do conteúdo.
    const { error } = await supabase.functions.invoke('request-first-access', {
      body: { email, loginUrl: `${window.location.origin}/login` },
    });

    setIsSending(false);

    if (error) {
      toast({
        title: 'Não foi possível reenviar agora',
        description: 'Tente novamente em instantes. Se persistir, fale com o seu gestor.',
        variant: 'destructive',
      });
      return;
    }

    setSent(true);
    toast({
      title: 'E-mail enviado',
      description: 'Se houver um convite pendente, um novo e-mail de primeiro acesso foi enviado.',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Origami Pulse" className="h-16 w-16" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              {sent ? (
                <MailCheck className="h-6 w-6 text-primary" />
              ) : (
                <Send className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">Primeiro acesso pendente</CardTitle>
          <CardDescription>
            {sent
              ? 'Enviamos um link de acesso para o seu e-mail. Clique nele para definir sua senha e entrar — verifique a caixa de entrada e o spam.'
              : 'Você ainda não definiu sua senha de acesso. Envie o link de primeiro acesso para o seu e-mail para concluir o cadastro.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <div className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground break-all">
              {email}
            </div>
          )}

          {!sent && (
            <Button className="w-full" onClick={handleResend} disabled={isSending || !email}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar link de primeiro acesso
                </>
              )}
            </Button>
          )}

          {sent && (
            <Button className="w-full" variant="outline" onClick={handleResend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                'Reenviar novamente'
              )}
            </Button>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReenviarPrimeiroAcesso;
