import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, ChevronDown, Eye, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBudgetVersions } from '@/hooks/useBudgetVersions';
import { BudgetVersionWithCreator } from '@/services/budgetVersionService';
import { formatCurrency } from '@/lib/formatters';
import { BudgetVersionModal } from './BudgetVersionModal';
import { cn } from '@/lib/utils';

interface BudgetVersionsSectionProps {
  budgetId: string;
}

export function BudgetVersionsSection({ budgetId }: BudgetVersionsSectionProps) {
  const { data: versions, isLoading } = useBudgetVersions(budgetId);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<BudgetVersionWithCreator | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const versionCount = versions?.length ?? 0;

  if (versionCount === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <History className="h-5 w-5" />
            <span>Nenhuma versão anterior registrada. O histórico começará a ser registrado a partir da próxima edição.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Versões
                  <Badge variant="secondary" className="ml-2">
                    {versionCount} {versionCount === 1 ? 'versão' : 'versões'}
                  </Badge>
                </CardTitle>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {versions?.map((version, index) => {
                  const isLatest = index === 0;
                  const createdAt = new Date(version.created_at);

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        isLatest ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">v{version.version_number}</span>
                          {isLatest && (
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Atual
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>
                            {format(createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {version.creator && (
                            <span className="ml-2">• {version.creator.nome}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-semibold">
                          {formatCurrency(version.snapshot_data.final_total)}
                        </span>
                        {!isLatest && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVersion(version)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {selectedVersion && (
        <BudgetVersionModal
          version={selectedVersion}
          open={!!selectedVersion}
          onClose={() => setSelectedVersion(null)}
        />
      )}
    </>
  );
}
