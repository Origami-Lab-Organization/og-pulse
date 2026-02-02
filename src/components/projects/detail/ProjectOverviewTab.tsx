import { FileText, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, INSTALLMENT_STATUS_LABELS, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

const installmentStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  invoiced: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const paymentMethodLabel = PAYMENT_METHOD_OPTIONS.find(
    (opt) => opt.value === project.payment_method
  )?.label || project.payment_method;

  return (
    <div className="space-y-6">
      {/* Description Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Descrição do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          ) : (
            <p className="text-muted-foreground italic">Nenhuma descrição cadastrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Team Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe do Projeto
          </CardTitle>
          <CardDescription>
            {project.members?.length || 0} membro(s) alocado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.members && project.members.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.members.map((member) => (
                <Badge key={member.id} variant="secondary" className="py-1 px-3">
                  {member.employee?.nome || 'Funcionário'} - {member.role} ({member.hours_per_month}h/mês)
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nenhum membro alocado.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Pagamento</CardTitle>
          <CardDescription>
            {paymentMethodLabel} • {project.installments_count} parcela(s) • Vencimento dia {project.due_day}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.installments && project.installments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">
                        {installment.installment_number}/{project.installments_count}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatCurrency(installment.value)}</TableCell>
                      <TableCell>
                        <Badge className={installmentStatusColors[installment.status]}>
                          {INSTALLMENT_STATUS_LABELS[installment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {installment.invoice_number || '-'}
                      </TableCell>
                      <TableCell>
                        {installment.payment_date 
                          ? format(parseISO(installment.payment_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nenhuma parcela cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
