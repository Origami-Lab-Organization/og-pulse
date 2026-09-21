import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, FolderKanban, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUnloggedHours, type LinhaDeFrente } from '@/hooks/useUnloggedHours';
import {
  COBERTURA_LABELS,
  CoberturaStatus,
  statusDaCobertura,
  type FrenteDaLinha,
  type LinhaDeHorasNaoLancadas,
} from '@/lib/unloggedHours';
import { formatHours } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/** As duas leituras da mesma verdade. Comparar sempre pelo membro (ADR-030). */
const Modo = { PESSOA: 'pessoa', PROJETO: 'projeto' } as const;
type Modo = (typeof Modo)[keyof typeof Modo];

const VARIANTE_POR_STATUS: Record<CoberturaStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [CoberturaStatus.EM_DIA]: 'secondary',
  [CoberturaStatus.PARCIAL]: 'outline',
  [CoberturaStatus.CRITICO]: 'destructive',
  [CoberturaStatus.SEM_COBRANCA]: 'outline',
};

export default function AnaliseHorasNaoLancadas() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [abertas, setAbertas] = useState<string[]>([]);
  const [modo, setModo] = useState<Modo>(Modo.PESSOA);

  const periodo = useMemo(
    () => ({ startDate: startOfMonth(mes), endDate: endOfMonth(mes) }),
    [mes],
  );

  const { relatorio, isLoading, error, refetch } = useUnloggedHours(periodo);

  const alternar = (id: string) =>
    setAbertas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  const ehMesCorrente = format(mes, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const alternadorDeModo = (
    <ToggleGroup
      type="single"
      value={modo}
      onValueChange={(v) => v && setModo(v as Modo)}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value={Modo.PESSOA} aria-label="Ver por pessoa">
        <User className="mr-1.5 h-3.5 w-3.5" />
        Por pessoa
      </ToggleGroupItem>
      <ToggleGroupItem value={Modo.PROJETO} aria-label="Ver por projeto">
        <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
        Por projeto
      </ToggleGroupItem>
    </ToggleGroup>
  );

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
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {alternadorDeModo}
          {seletorDeMes}
        </div>
      }
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
              {modo === Modo.PESSOA ? 'Por pessoa' : 'Por projeto'}
            </CardTitle>
            <CardDescription>
              {modo === Modo.PESSOA ? (
                <>
                  Só quem lança hora entra na lista. Quem está marcado como "não lança horas"
                  tem centro de custo vinculado e o custo dele já cai inteiro lá. Feriados,
                  férias aprovadas, admissão e desligamento saem da jornada esperada.
                </>
              ) : (
                <>
                  Aqui o buraco é outro: o que o projeto <strong>planejou</strong> e não
                  recebeu de hora. Uma pessoa pode estar em dia com a jornada e ainda assim
                  ter deixado um projeto a descoberto.
                </>
              )}
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
            ) : modo === Modo.PROJETO ? (
              <TabelaPorFrente
                frentes={relatorio.frentes}
                abertas={abertas}
                onAlternar={alternar}
              />
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
                      <TableHead className="w-10" />
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
                      <LinhaDaPessoa
                        key={linha.employeeId}
                        linha={linha}
                        aberta={abertas.includes(linha.employeeId)}
                        onAlternar={() => alternar(linha.employeeId)}
                      />
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

function LinhaDaPessoa({
  linha,
  aberta,
  onAlternar,
}: {
  linha: LinhaDeHorasNaoLancadas;
  aberta: boolean;
  onAlternar: () => void;
}) {
  const status = statusDaCobertura(linha);
  const temDetalhe = linha.frentes.length > 0;

  return (
    <>
    <TableRow className={cn(temDetalhe && 'cursor-pointer')} onClick={temDetalhe ? onAlternar : undefined}>
      <TableCell className="pr-0">
        {temDetalhe && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-expanded={aberta}
            aria-label={aberta ? `Recolher ${linha.nome}` : `Ver onde ${linha.nome} planejou e apontou`}
            onClick={(e) => {
              e.stopPropagation();
              onAlternar();
            }}
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', aberta && 'rotate-90')}
            />
          </Button>
        )}
      </TableCell>
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
    {aberta && <DetalheDaPessoa frentes={linha.frentes} />}
    </>
  );
}

/**
 * Onde a pessoa planejou e apontou no mês.
 *
 * Projeto com planejado e SEM apontamento aparece com 0h de propósito: é o caso que responde
 * "onde era para ter hora e não teve", que é a pergunta que traz alguém a esta tela.
 */
function DetalheDaPessoa({ frentes }: { frentes: readonly FrenteDaLinha[] }) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell />
      <TableCell colSpan={7} className="py-3">
        <p className="ol-label mb-2 text-muted-foreground">Onde planejou e apontou</p>
        <ul className="space-y-1">
          {frentes.map((frente) => (
            <li key={frente.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">{frente.nome}</span>
              <Badge variant="outline" className="shrink-0 font-normal">
                {frente.tipo === 'projeto' ? 'Projeto' : 'Atividade interna'}
              </Badge>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                planejado {formatHours(frente.planejado)}
              </span>
              <span
                className={cn(
                  'shrink-0 tabular-nums',
                  frente.apontado === 0 && frente.planejado > 0
                    ? 'font-medium text-destructive'
                    : 'text-foreground',
                )}
              >
                apontado {formatHours(frente.apontado)}
              </span>
            </li>
          ))}
        </ul>
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
  const { code: codigo, message: mensagem } = (erro ?? {}) as {
    code?: string;
    message?: string;
  };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Não foi possível montar o relatório. Os números acima ficariam errados, então foram
        escondidos em vez de mostrar zero.
      </p>
      {/* A MENSAGEM vai junto do código, e não só o código. `PGRST201` sozinho não diz qual
          consulta falhou nem por quê — custou uma caçada. A mensagem do PostgREST nomeia as
          tabelas e o motivo, e é ela que resolve em um minuto. */}
      {(codigo || mensagem) && (
        <div className="max-w-xl space-y-1">
          {codigo && (
            <p className="text-xs text-muted-foreground">
              Código: <code className="font-mono">{codigo}</code>
            </p>
          )}
          {mensagem && (
            <p className="break-words text-xs text-muted-foreground">{mensagem}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Mande isto para quem cuida do sistema.
          </p>
        </div>
      )}
      <Button onClick={onTentarDeNovo}>Tentar de novo</Button>
    </div>
  );
}

/** A leitura por projeto: quanto cada frente planejou e quanto recebeu. */
function TabelaPorFrente({
  frentes,
  abertas,
  onAlternar,
}: {
  frentes: LinhaDeFrente[];
  abertas: string[];
  onAlternar: (id: string) => void;
}) {
  if (frentes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum projeto com hora planejada ou apontada neste mês.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Frente</TableHead>
            <TableHead className="text-right">Planejado</TableHead>
            <TableHead className="text-right">Apontado</TableHead>
            <TableHead className="text-right">Planejado sem hora</TableHead>
            <TableHead className="text-right">Pessoas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {frentes.map((frente) => (
            <LinhaDaFrente
              key={frente.id}
              frente={frente}
              aberta={abertas.includes(frente.id)}
              onAlternar={() => onAlternar(frente.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LinhaDaFrente({
  frente,
  aberta,
  onAlternar,
}: {
  frente: LinhaDeFrente;
  aberta: boolean;
  onAlternar: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onAlternar}>
        <TableCell className="pr-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-expanded={aberta}
            aria-label={aberta ? `Recolher ${frente.nome}` : `Ver quem está em ${frente.nome}`}
            onClick={(e) => {
              e.stopPropagation();
              onAlternar();
            }}
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', aberta && 'rotate-90')} />
          </Button>
        </TableCell>
        <TableCell>
          <p className="truncate font-medium text-foreground">{frente.nome}</p>
          <Badge variant="outline" className="mt-1 font-normal">
            {frente.tipo === 'projeto' ? 'Projeto' : 'Atividade interna'}
          </Badge>
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {formatHours(frente.planejado)}
        </TableCell>
        <TableCell className="text-right tabular-nums">{formatHours(frente.apontado)}</TableCell>
        <TableCell
          className={cn(
            'text-right font-medium tabular-nums',
            frente.naoRealizado > 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {/* Atividade interna não tem planejamento, então a coluna não se aplica — mostrar
              0h ali leria como "está tudo certo", que é diferente de "não se mede assim". */}
          {frente.tipo === 'projeto' ? formatHours(frente.naoRealizado) : '—'}
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {frente.pessoas.length}
        </TableCell>
      </TableRow>

      {aberta && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={5} className="py-3">
            <p className="ol-label mb-2 text-muted-foreground">Quem está nesta frente</p>
            <ul className="space-y-1">
              {frente.pessoas.map((pessoa) => (
                <li
                  key={pessoa.employeeId}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{pessoa.nome}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    planejado {formatHours(pessoa.planejado)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      pessoa.apontado === 0 && pessoa.planejado > 0
                        ? 'font-medium text-destructive'
                        : 'text-foreground',
                    )}
                  >
                    apontado {formatHours(pessoa.apontado)}
                  </span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
