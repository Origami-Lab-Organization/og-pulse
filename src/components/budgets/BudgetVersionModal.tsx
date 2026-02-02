import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BudgetVersionWithCreator } from '@/services/budgetVersionService';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { getBudgetStatusOption } from '@/types/budget';

interface BudgetVersionModalProps {
  version: BudgetVersionWithCreator;
  open: boolean;
  onClose: () => void;
}

export function BudgetVersionModal({ version, open, onClose }: BudgetVersionModalProps) {
  const snapshot = version.snapshot_data;
  const statusOption = getBudgetStatusOption(snapshot.status as any);
  const createdAt = new Date(version.created_at);

  // Calculate totals from snapshot
  const totalHours = snapshot.roles.reduce(
    (acc, role) => acc + role.months.reduce((h, m) => h + m.hours, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Versão {version.version_number}
          </DialogTitle>
          <DialogDescription>
            Salva em {format(createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {version.creator && ` por ${version.creator.nome}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{snapshot.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusOption.color}>{statusOption.label}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-medium">{snapshot.duration_months} meses</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Início</p>
                <p className="font-medium">
                  {format(parseDateString(snapshot.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              {snapshot.valid_until && (
                <div>
                  <p className="text-sm text-muted-foreground">Válido até</p>
                  <p className="font-medium">
                    {format(parseDateString(snapshot.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

            {/* Client/Lead */}
            <div>
              <p className="text-sm text-muted-foreground">
                {snapshot.client_id ? 'Cliente' : 'Lead'}
              </p>
              <p className="font-medium">
                {snapshot.client_name || snapshot.lead_name || '-'}
              </p>
              {snapshot.lead_contact && (
                <p className="text-sm text-muted-foreground">{snapshot.lead_contact}</p>
              )}
            </div>

            <Separator />

            {/* Roles */}
            <div>
              <h4 className="font-semibold mb-3">Papéis ({snapshot.roles.length})</h4>
              <div className="space-y-2">
                {snapshot.roles.map((role, idx) => {
                  const roleHours = role.months.reduce((h, m) => h + m.hours, 0);
                  const roleValue = roleHours * role.hourly_rate;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{role.role_name}</span>
                        <Badge variant="outline">{role.seniority}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(roleValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {roleHours}h × {formatCurrency(role.hourly_rate)}/h
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suppliers */}
            {snapshot.suppliers.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Fornecedores ({snapshot.suppliers.length})</h4>
                <div className="space-y-2">
                  {snapshot.suppliers.map((supplier, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div>
                        <span className="font-medium">{supplier.name}</span>
                        {supplier.description && (
                          <p className="text-sm text-muted-foreground">{supplier.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(supplier.monthly_value * snapshot.duration_months)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(supplier.monthly_value)}/mês
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {snapshot.materials.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Materiais ({snapshot.materials.length})</h4>
                <div className="space-y-2">
                  {snapshot.materials.map((material, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <span>{material.description}</span>
                      <span className="font-medium">{formatCurrency(material.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Financial summary */}
            <div>
              <h4 className="font-semibold mb-3">Resumo Financeiro</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Horas</span>
                  <span>{totalHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Base (Subtotal)</span>
                  <span>{formatCurrency(snapshot.subtotal)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Despesas Administrativas ({snapshot.admin_expenses_percent}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Impostos ({snapshot.taxes_percent}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Comissão ({snapshot.commission_percent}%)
                  </span>
                </div>
                {snapshot.net_margin_percent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Margem Líquida ({snapshot.net_margin_percent}%)
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="font-medium">Preço de Venda</span>
                  <span className="font-medium">{formatCurrency(snapshot.total_with_fees)}</span>
                </div>
                {snapshot.discount_value > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto</span>
                    <span>-{formatCurrency(snapshot.discount_value)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-2">
                  <span className="font-bold">Valor Final</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(snapshot.final_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {snapshot.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{snapshot.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
