import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';

interface MicrosoftConnectPromptProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onConnect: () => void;
  isConnecting: boolean;
}

/** Convite para autorizar a conta Microsoft, usado por Agenda e E-mails. */
export function MicrosoftConnectPrompt({
  icon,
  title,
  description,
  onConnect,
  isConnecting,
}: MicrosoftConnectPromptProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
        </div>
        <Button variant="gradient" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MicrosoftLogo className="mr-2 h-4 w-4" />
          )}
          {isConnecting ? 'Aguardando autorização...' : 'Conectar Microsoft'}
        </Button>
      </CardContent>
    </Card>
  );
}
