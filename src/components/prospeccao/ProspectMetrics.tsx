import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProspectMetricsActivities } from '@/hooks/useProspectActivities';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import {
  calculateProspectMetrics,
  countBusinessDays,
  formatRate,
  groupByCut,
  type ProspectCut,
} from '@/lib/prospecting/metrics';
import { toISODate, type ProspectWithCompany } from '@/types/prospect';

const PERIODOS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const CORTES: Array<{ value: ProspectCut; label: string }> = [
  { value: 'lever', label: 'Alavanca' },
  { value: 'ring', label: 'Anel' },
  { value: 'tier', label: 'Tier' },
  { value: 'owner', label: 'Responsável' },
];

interface ProspectMetricsProps {
  prospects: ProspectWithCompany[];
}

export function ProspectMetrics({ prospects }: ProspectMetricsProps) {
  const [dias, setDias] = useState('30');
  const [corte, setCorte] = useState<ProspectCut>('lever');

  const hoje = toISODate(new Date());
  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dias));
    return toISODate(d);
  }, [dias]);

  const { data: atividades = [], isLoading } = useProspectMetricsActivities(desde);
  const { byId } = useEmployeeDirectoryMap();

  const diasUteis = useMemo(() => countBusinessDays(desde, hoje), [desde, hoje]);
  const metricas = useMemo(
    () => calculateProspectMetrics(prospects, atividades, diasUteis),
    [prospects, atividades, diasUteis],
  );
  const grupos = useMemo(
    () => groupByCut(prospects, atividades, corte, diasUteis),
    [prospects, atividades, corte, diasUteis],
  );

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Carregando métricas">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const nomeDoGrupo = (chave: string) =>
    corte === 'owner' ? byId.get(chave)?.nome ?? 'Sem responsável' : chave;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-44" aria-label="Período"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={corte} onValueChange={(v) => setCorte(v as ProspectCut)}>
          <SelectTrigger className="w-44" aria-label="Recorte"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CORTES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Taxa de resposta" valor={formatRate(metricas.responseRate)}
                   detalhe={`${metricas.touchedContacts} contatos tocados`} />
        <Indicador titulo="Taxa de reunião" valor={formatRate(metricas.meetingRate)}
                   detalhe="reunião ÷ tocado" />
        <Indicador titulo="Atividades no período" valor={String(metricas.totalActivities)}
                   detalhe={`${diasUteis} dias úteis`} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Taxa de resposta por número da atividade</CardTitle>
          <p className="text-sm text-muted-foreground">
            É esta que diz se a cadência deve ter 3 ou 6 toques.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade nº</TableHead>
                <TableHead className="text-right">Registradas</TableHead>
                <TableHead className="text-right">Respostas</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricas.responseByTouch.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma atividade no período.
                  </TableCell>
                </TableRow>
              )}
              {metricas.responseByTouch.map((linha) => (
                <TableRow key={linha.sequenceNo}>
                  <TableCell>{linha.sequenceNo}</TableCell>
                  <TableCell className="text-right">{linha.activities}</TableCell>
                  <TableCell className="text-right">{linha.responses}</TableCell>
                  <TableCell className="text-right font-medium">{formatRate(linha.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Atividades por pessoa</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead className="text-right">Atividades</TableHead>
                <TableHead className="text-right">Por dia útil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricas.activitiesPerPerson.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma atividade no período.
                  </TableCell>
                </TableRow>
              )}
              {metricas.activitiesPerPerson.map((linha) => (
                <TableRow key={linha.ownerId}>
                  <TableCell>{byId.get(linha.ownerId)?.nome ?? '—'}</TableCell>
                  <TableCell className="text-right">{linha.activities}</TableCell>
                  <TableCell className="text-right">{linha.perBusinessDay.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Por {CORTES.find((c) => c.value === corte)?.label.toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Tocados</TableHead>
                <TableHead className="text-right">Resposta</TableHead>
                <TableHead className="text-right">Reunião</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem dados no período.
                  </TableCell>
                </TableRow>
              )}
              {grupos.map((grupo) => (
                <TableRow key={grupo.key}>
                  <TableCell>{nomeDoGrupo(grupo.key)}</TableCell>
                  <TableCell className="text-right">{grupo.metrics.touchedContacts}</TableCell>
                  <TableCell className="text-right">{formatRate(grupo.metrics.responseRate)}</TableCell>
                  <TableCell className="text-right">{formatRate(grupo.metrics.meetingRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Indicador({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-xs text-muted-foreground">{detalhe}</p>
      </CardContent>
    </Card>
  );
}
