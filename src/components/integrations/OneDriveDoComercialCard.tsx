import { useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { OneDriveRootPicker } from '@/components/projects/detail/OneDriveRootPicker';
import { useLigarPastaDoComercial, usePastaDoComercial } from '@/hooks/useItensDoEstudo';
import { useMicrosoftConnection } from '@/hooks/useMicrosoftGraph';
import { formatDate } from '@/lib/formatters';

function Pasta({ caminho, ligadaEm }: { caminho: string | null; ligadaEm: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <FolderOpen className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="grid min-w-0 leading-tight">
        <span className="truncate text-sm font-medium">{caminho ?? 'Nenhuma pasta escolhida'}</span>
        {ligadaEm && <span className="text-xs text-muted-foreground">desde {formatDate(ligadaEm)}</span>}
      </div>
    </div>
  );
}

/**
 * Pasta do Comercial no OneDrive (US-0053): dentro dela o Pulse cria uma pasta por empresa para os
 * arquivos do Estudo da conta. O admin escolhe uma vez; trocar não move as pastas já criadas.
 */
export function OneDriveDoComercialCard() {
  const { data: pasta, isLoading } = usePastaDoComercial();
  const ligar = useLigarPastaDoComercial();
  const microsoft = useMicrosoftConnection();
  const [escolhendo, setEscolhendo] = useState(false);
  const acao = microsoft.isConnected ? (
    <Button variant="outline" size="sm" onClick={() => setEscolhendo(true)}>{pasta ? 'Trocar pasta' : 'Escolher pasta'}</Button>
  ) : (
    <Button variant="outline" size="sm" onClick={microsoft.connect} disabled={microsoft.isConnecting || !microsoft.isConfigured}>
      {microsoft.isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <MicrosoftLogo className="mr-2 h-4 w-4" />}
      Conectar Microsoft
    </Button>
  );
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">OneDrive do Comercial</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {isLoading ? <Skeleton className="h-9 w-64" /> : <Pasta caminho={pasta?.caminho ?? null} ligadaEm={pasta?.ligada_em ?? null} />}
        {acao}
      </CardContent>
      <OneDriveRootPicker
        open={escolhendo}
        onOpenChange={setEscolhendo}
        isSaving={ligar.isPending}
        onConfirm={(folder) => ligar.mutate(folder, { onSuccess: () => setEscolhendo(false) })}
      />
    </Card>
  );
}
