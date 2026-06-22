import { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminDashboardSectionProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  comingSoon?: boolean;
  comingSoonMessage?: string;
  children?: ReactNode;
  /** Conteúdo opcional no canto superior direito do header (ex.: badge/contagem). */
  headerAction?: ReactNode;
}

/**
 * Container padrão para blocos do Dashboard que exibem listas/conteúdo rico
 * (aniversariantes, saúde operacional, pipeline). Trata loading, vazio
 * orientativo e "em breve" de forma consistente — sem inventar dado.
 */
export function AdminDashboardSection({
  title,
  icon: Icon,
  description,
  loading = false,
  empty = false,
  emptyMessage = 'Sem dados para o período selecionado.',
  comingSoon = false,
  comingSoonMessage = 'Este bloco entra quando o módulo estiver disponível.',
  children,
  headerAction,
}: AdminDashboardSectionProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {comingSoon ? (
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground">
              Em breve
            </span>
          ) : (
            headerAction
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comingSoon ? (
          <p className="text-sm text-muted-foreground">{comingSoonMessage}</p>
        ) : empty ? (
          <div className="flex items-center justify-center text-center h-32">
            <p className="text-sm text-muted-foreground max-w-xs">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
