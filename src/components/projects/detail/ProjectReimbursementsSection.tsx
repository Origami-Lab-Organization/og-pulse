import { useState } from 'react';
import { Receipt, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReimbursementRequest, useDeleteReimbursement } from '@/hooks/useReimbursements';
import { ReimbursementDetailDialog } from './ReimbursementDetailDialog';
import { DeleteReimbursementDialog } from './DeleteReimbursementDialog';

type EnrichedReimbursement = ReimbursementRequest & { requester_name?: string; reviewer_name?: string };

interface ProjectReimbursementsSectionProps {
  reimbursements: EnrichedReimbursement[];
  isEditable?: boolean;
}

export function ProjectReimbursementsSection({ reimbursements, isEditable = false }: ProjectReimbursementsSectionProps) {
  const formatCurrency = useMaskedCurrency();
  const totalValue = reimbursements.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const deleteMutation = useDeleteReimbursement();

  const [selectedReimbursement, setSelectedReimbursement] = useState<EnrichedReimbursement | null>(null);
  const [deleteReimbursement, setDeleteReimbursement] = useState<EnrichedReimbursement | null>(null);

  const handleDelete = (reason: string) => {
    if (!deleteReimbursement) return;
    deleteMutation.mutate(
      { reimbursementId: deleteReimbursement.id, reason },
      { onSuccess: () => setDeleteReimbursement(null) }
    );
  };

  return (
    <>
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
                    <TableHead>Aprovado por</TableHead>
                    <TableHead className="text-center">Data Aprovação</TableHead>
                    {isEditable && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedReimbursement(r)}
                    >
                      <TableCell className="font-medium">{r.requester_name || 'Desconhecido'}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                      <TableCell>{r.reviewer_name || '-'}</TableCell>
                      <TableCell className="text-center">
                        {r.reviewed_at
                          ? format(parseISO(r.reviewed_at), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      {isEditable && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteReimbursement(r);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    {isEditable && <TableCell />}
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

      <ReimbursementDetailDialog
        open={!!selectedReimbursement}
        onOpenChange={(v) => { if (!v) setSelectedReimbursement(null); }}
        reimbursement={selectedReimbursement}
      />

      <DeleteReimbursementDialog
        open={!!deleteReimbursement}
        onOpenChange={(v) => { if (!v) setDeleteReimbursement(null); }}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
