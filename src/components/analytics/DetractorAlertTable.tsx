import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { STAKEHOLDER_ACTION_LABELS } from '@/types/projectStakeholder';
import type { StakeholderAction } from '@/types/projectStakeholder';

interface DetractorRow {
  name: string;
  projectName: string;
  jobTitle: string | null;
  action: string | null;
}

interface DetractorAlertTableProps {
  data: DetractorRow[];
}

export function DetractorAlertTable({ data }: DetractorAlertTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-10 w-10" />
          <p className="text-sm font-medium">
            Nenhum detrator com alta influência identificado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
        <CardTitle className="text-base text-destructive">
          Atenção: Detratores com Alta Influência
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stakeholder</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Ação Recomendada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{row.jobTitle ?? '—'}</TableCell>
                <TableCell>
                  {row.action
                    ? STAKEHOLDER_ACTION_LABELS[row.action as StakeholderAction]
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
