import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUnloggedHours } from '@/hooks/useUnloggedHours';
import {
  COBERTURA_LABELS,
  CoberturaStatus,
  statusDaCobertura,
  type LinhaDeHorasNaoLancadas,
} from '@/lib/unloggedHours';
import { formatHours } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const VARIANTE_POR_STATUS: Record<CoberturaStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [CoberturaStatus.EM_DIA]: 'secondary',
  [CoberturaStatus.PARCIAL]: 'outline',
  [CoberturaStatus.CRITICO]: 'destructive',
  [CoberturaStatus.SEM_COBRANCA]: 'outline',
};

export default function AnaliseHorasNaoLancadas() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));

  const periodo = useMemo(
    () => ({ startDate: startOfMonth(mes), endDate: endOfMonth(mes) }),
    [mes],
  );

  const { relatorio, isLoading, error, refetch } = useUnloggedHours(periodo);

  const ehMesCorrente = format(mes, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const seletorDeMes = (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => setMes((m) => addMonths(m, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium capitalize">
        {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        disabled={ehMesCorrente}
        onClick={() => setMes((m) => addMonths(m, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AppLayout
      title="Horas não lançadas"
      description="Quem lança hora, quanto a jornada esperava e quanto foi apontado no mês."
      breadcrumbs={[{ label: 'Análises' }, { label: 'Horas não lançadas' }]}
      actions={seletorDeMes}
    >
      <div className="min-w-0 space-y-6">
        <div className={cn('grid gap-4 md:grid-cols-4', error && 'hidden')}>
          <Indicador titulo="Jornada esperada" valor={formatHours(relatorio.totalCapacidade)} />
          <Indicador titulo="Apontado" valor={formatHours(relatorio.totalLancado)} />
          <Indicador
            titulo="Não lançadas"
            valor={formatHours(relatorio.totalNaoLancadas)}
            destaque={relatorio.totalNaoLancadas > 0}
            rodape="Horas pagas que não apareceram em centro de custo nenhum"
          />
          <Indicador
            titulo="Pessoas em atraso"
            valor={String(relatorio.pessoasEmAtraso)}
            destaque={relatorio.pessoasEmAtraso > 0}
            rodape="Abaixo de 90% da jornada apontada"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Por pessoa
            </CardTitle>
            <CardDescription>
              Só quem lança hora entra na lista. Quem está marcado como "não lança horas" tem
              centro de custo vinculado e o custo dele já cai inteiro lá. Feriados, férias
              aprovadas, admissão e desligamento saem da jornada esperada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Falha e vazio são coisas diferentes, e uma tela que mostra 0h nos dois casos
                mente. O código do erro aparece porque o DevTools é bloqueado por política
                nas máquinas do time — sem ele a falha não deixa rastro que dê para reportar. */}
            {error ? (
              <FalhouAoCarregar erro={error} onTentarDeNovo={() => refetch()} />
            ) : isLoading ? (
              <Skeleton className="h-64 rounded-md" />
            ) : relatorio.linhas.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ninguém com jornada a apontar neste mês. Ou ninguém está marcado como quem
                lança hora, ou o mês inteiro caiu em férias, feriado ou fora do vínculo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead className="text-right">Dias úteis</TableHead>
                      <TableHead className="text-right">Jornada esperada</TableHead>
                      <TableHead className="text-right">Apontado</TableHead>
                      <TableHead className="text-right">Não lançadas</TableHead>
                      <TableHead className="text-right">Planejado</TableHead>
                      <TableHead className="w-[180px]">Cobertura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.linhas.map((linha) => (
                      <LinhaDaPessoa key={linha.employeeId} linha={linha} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Indicador({
  titulo,
  valor,
  rodape,
  destaque,
}: {
  titulo: string;
  valor: string;
  rodape?: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="ol-label text-muted-foreground">{titulo}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          destaque ? 'text-destructive' : 'text-foreground',
        )}
      >
        {valor}
      </p>
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </div>
  );
}

function LinhaDaPessoa({ linha }: { linha: LinhaDeHorasNaoLancadas }) {
  const status = statusDaCobertura(linha);

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{linha.nome}</p>
          {linha.cargo && (
            <p className="truncate text-xs text-muted-foreground">{linha.cargo}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {linha.diasUteis}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatHours(linha.capacidade)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatHours(linha.lancado)}</TableCell>
      <TableCell
        className={cn(
          'text-right font-medium tabular-nums',
          linha.naoLancadas > 0 ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {formatHours(linha.naoLancadas)}
      </TableCell>
      {/* Contexto, não cobrança: o planejado só cobre alocação em projeto, e a jornada paga
          cobre tudo. Ver o cabeçalho de `@/lib/unloggedHours`. */}
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatHours(linha.planejado)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={Math.min(100, linha.cobertura)} className="h-2 flex-1" />
          <Badge variant={VARIANTE_POR_STATUS[status]} className="shrink-0 tabular-nums">
            {Math.round(linha.cobertura)}%
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{COBERTURA_LABELS[status]}</p>
      </TableCell>
    </TableRow>
  );
}

function FalhouAoCarregar({
  erro,
  onTentarDeNovo,
}: {
  erro: unknown;
  onTentarDeNovo: () => void;
}) {
  const codigo = (erro as { code?: string } | null)?.code;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Não foi possível montar o relatório. Os números acima ficariam errados, então foram
        escondidos em vez de mostrar zero.
      </p>
      {codigo && (
        <p className="text-xs text-muted-foreground">
          Código do erro: <code className="font-mono">{codigo}</code> — mande este código para
          quem cuida do sistema.
        </p>
      )}
      <Button onClick={onTentarDeNovo}>Tentar de novo</Button>
    </div>
  );
}
