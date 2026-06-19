import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReimbursementRequest } from '@/hooks/useReimbursements';
import { ReimbursementDetailDialog } from './ReimbursementDetailDialog';

type EnrichedReimbursement = ReimbursementRequest & { requester_name?: string; reviewer_name?: string };

interface ProjectReimbursementsSectionProps {
  reimbursements: EnrichedReimbursement[];
}

function StatusBadge({ status }: { status: string }) {
  // Tokens semânticos do tema (success/warning) — padrão ui-badge do origami-ds:
  // fundo suave + texto na cor semântica. Sem cores hardcoded.
  if (status === 'paid') {
    return (
      <Badge variant="outline" className="border-transparent bg-primary-deep/10 text-primary-deep hover:bg-primary-deep/10">
        Pago
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-transparent bg-warning/15 text-warning-foreground hover:bg-warning/15">
      Aprovado
    </Badge>
  );
}

export function ProjectReimbursementsSection({ reimbursements }: ProjectReimbursementsSectionProps) {
  const formatCurrency = useMaskedCurrency();
  const totalValue = reimbursements.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const [selectedReimbursement, setSelectedReimbursement] = useState<EnrichedReimbursement | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Reembolsos
          </CardTitle>
          <CardDescription>
            Reembolsos aprovados vinculados a este projeto (somente leitura)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reimbursements.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Data pagamento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((r) => {
                    const paymentDateStr = r.paid_at || r.reviewed_at;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedReimbursement(r)}
                      >
                        <TableCell>{r.description}</TableCell>
                        <TableCell className="font-medium">{r.requester_name || 'Desconhecido'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                        <TableCell className="text-center">
                          {paymentDateStr
                            ? format(parseISO(paymentDateStr), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              Nenhum reembolso registrado para este projeto.
            </p>
          )}
        </CardContent>
      </Card>

      <ReimbursementDetailDialog
        open={!!selectedReimbursement}
        onOpenChange={(v) => { if (!v) setSelectedReimbursement(null); }}
        reimbursement={selectedReimbursement}
      />
    </>
  );
}
