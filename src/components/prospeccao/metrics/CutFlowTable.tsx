import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ProspectCut } from '@/lib/prospecting/metrics';
import type { CutFlowRow } from '@/types/prospectMetrics';

const CUT_OPTIONS: ReadonlyArray<{ value: ProspectCut; label: string }> = [
  { value: 'lever', label: 'Alavanca' },
  { value: 'ring', label: 'Anel' },
  { value: 'tier', label: 'Tier' },
  { value: 'owner', label: 'Responsável' },
];

const COLUNAS: ReadonlyArray<{ key: Exclude<keyof CutFlowRow, 'key'>; label: string }> = [
  { key: 'ativados', label: 'Ativados' },
  { key: 'conversas', label: 'Conversas' },
  { key: 'agendadas', label: 'Agendadas' },
  { key: 'feitas', label: 'Feitas' },
  { key: 'qualificadas', label: 'Qualificadas' },
  { key: 'ganhos', label: 'Ganhos' },
  { key: 'perdas', label: 'Perdas' },
];

interface CutFlowTableProps {
  rows: CutFlowRow[];
  cut: ProspectCut;
  onCutChange: (cut: ProspectCut) => void;
  groupName: (key: string) => string;
}

/** O que aconteceu no período, quebrado por recorte — os mesmos marcos dos números do topo. */
export function CutFlowTable(props: CutFlowTableProps) {
  const { rows, cut, onCutChange, groupName } = props;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Por recorte</CardTitle>
          <p className="text-sm text-muted-foreground">Marcos alcançados no período, por grupo.</p>
        </div>
        <Select value={cut} onValueChange={(v) => onCutChange(v as ProspectCut)}>
          <SelectTrigger className="w-40" aria-label="Recorte"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CUT_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{CUT_OPTIONS.find((c) => c.value === cut)?.label}</TableHead>
              {COLUNAS.map((c) => <TableHead key={c.key} className="text-right">{c.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUNAS.length + 1} className="text-center text-muted-foreground">
                  Nada aconteceu no período com esses filtros.
                </TableCell>
              </TableRow>
            )}
            {rows.map((linha) => (
              <TableRow key={linha.key}>
                <TableCell>{groupName(linha.key)}</TableCell>
                {COLUNAS.map((c) => (
                  <TableCell key={c.key} className="text-right tabular-nums">{linha[c.key]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
