import { Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReimbursementRequest } from '@/hooks/useReimbursements';

interface ProjectReimbursementsSectionProps {
  reimbursements: (ReimbursementRequest & { requester_name?: string })[];
}

export function ProjectReimbursementsSection({ reimbursements }: ProjectReimbursementsSectionProps) {
  const totalValue = reimbursements.reduce((sum, r) => sum + Number(r.total_amount), 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Reembolsos
          </CardTitle>
          <CardDescription>
            Reembolsos aprovados vinculados a este projeto
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {reimbursements.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Data Aprovação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requester_name || 'Desconhecido'}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell className="text-center">
                      {r.reviewed_at
                        ? format(parseISO(r.reviewed_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totalValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground italic text-center py-8">
            Nenhum reembolso aprovado para este projeto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
