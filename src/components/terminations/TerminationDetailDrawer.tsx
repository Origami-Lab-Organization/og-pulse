import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, Printer, FileDown, Info, DollarSign, FileText, Clock } from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TerminationStatusBadge } from './TerminationStatusBadge';
import { TerminationTypeBadge } from './TerminationTypeBadge';
import { TerminationDetailInfoTab } from './detail/TerminationDetailInfoTab';
import { TerminationDetailFinancialTab } from './detail/TerminationDetailFinancialTab';
import { TerminationDetailDocumentsTab } from './detail/TerminationDetailDocumentsTab';
import { TerminationDetailHistoryTab } from './detail/TerminationDetailHistoryTab';
import { TerminationWithEmployee } from '@/services/terminationService';
import { useTermination, useUpdateTermination } from '@/hooks/useTerminations';
import { TerminationStatus } from '@/types/termination';
import { useToast } from '@/hooks/use-toast';

interface TerminationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  termination: TerminationWithEmployee | null;
}

export const TerminationDetailDrawer = ({ isOpen, onClose, termination }: TerminationDetailDrawerProps) => {
  const { toast } = useToast();
  const updateTermination = useUpdateTermination();

  if (!termination) return null;

  const emp = termination.employees;
  const admissionDate = new Date(termination.termination_date);
  const initials = emp.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleStatusChange = (newStatus: TerminationStatus) => {
    updateTermination.mutate(
      { id: termination.id, updates: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: 'Status atualizado', description: `Desligamento marcado como ${newStatus === 'in_progress' ? 'Em Andamento' : 'Concluído'}.` });
        },
      }
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="sr-only">Detalhes do Desligamento</SheetTitle>
        </SheetHeader>

        {/* Employee Header Card */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={emp.foto_url || undefined} alt={emp.nome} />
              <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{emp.nome}</h2>
              <p className="text-sm text-muted-foreground">{emp.cargo} • {emp.tipo_contratacao}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <TerminationStatusBadge status={termination.status as TerminationStatus} />
                <TerminationTypeBadge type={termination.termination_type as any} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 h-auto py-0">
            <TabsTrigger value="info" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <Info className="h-4 w-4" /> Informações
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <DollarSign className="h-4 w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <FileText className="h-4 w-4" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <Clock className="h-4 w-4" /> Histórico
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="info" className="mt-0">
              <TerminationDetailInfoTab termination={termination} />
            </TabsContent>
            <TabsContent value="financial" className="mt-0">
              <TerminationDetailFinancialTab termination={termination} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <TerminationDetailDocumentsTab termination={termination} />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <TerminationDetailHistoryTab termination={termination} />
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        {/* Footer */}
        <div className="p-6 flex items-center justify-end gap-3">
          {termination.status === 'pending' && (
            <Button onClick={() => handleStatusChange('in_progress')} disabled={updateTermination.isPending}>
              Iniciar Processo
            </Button>
          )}
          {termination.status === 'in_progress' && (
            <Button onClick={() => handleStatusChange('completed')} disabled={updateTermination.isPending}>
              Concluir Desligamento
            </Button>
          )}
          {termination.status === 'completed' && (
            <p className="text-sm text-muted-foreground">
              Concluído em {format(new Date(termination.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
