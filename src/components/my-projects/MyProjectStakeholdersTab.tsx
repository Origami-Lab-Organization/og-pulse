import { Building2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Stakeholder {
  name: string;
  role: string;
  organization: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
}

interface MyProjectStakeholdersTabProps {
  stakeholders: Stakeholder[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

const TYPE_LABELS: Record<string, string> = {
  decisor: 'Decisor',
  decision_maker: 'Decisor',
  influenciador: 'Influenciador',
  influencer: 'Influenciador',
  tecnico: 'Técnico',
  technical: 'Técnico',
  sponsor: 'Patrocinador',
  user: 'Usuário',
  other: 'Outro',
};

function getTypeLabel(type: string): string {
  return TYPE_LABELS[type.toLowerCase()] ?? type;
}

function TypeBadge({ type }: { type: string }) {
  const label = getTypeLabel(type);
  const normalized = type.toLowerCase();

  if (normalized === 'decisor' || normalized === 'decision_maker') {
    return (
      <Badge
        variant="outline"
        className="text-xs border-destructive/20 bg-destructive/10 text-destructive shrink-0"
      >
        {label}
      </Badge>
    );
  }
  if (normalized === 'influenciador' || normalized === 'influencer') {
    return (
      <Badge
        variant="outline"
        className="text-xs border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 shrink-0"
      >
        {label}
      </Badge>
    );
  }
  if (normalized === 'tecnico' || normalized === 'technical') {
    return (
      <Badge
        variant="outline"
        className="text-xs border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400 shrink-0"
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs shrink-0">
      {label}
    </Badge>
  );
}

export function MyProjectStakeholdersTab({ stakeholders }: MyProjectStakeholdersTabProps) {
  if (stakeholders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Nenhum stakeholder mapeado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Os stakeholders deste projeto ainda não foram cadastrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Stakeholders do Projeto
          <span className="text-xs text-muted-foreground font-normal">
            ({stakeholders.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stakeholders.map((s, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {getInitials(s.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-snug">{s.name}</p>
                  {s.jobTitle && <TypeBadge type={s.jobTitle} />}
                </div>

                <p className="text-xs text-muted-foreground truncate">{s.role}</p>

                {s.organization && (
                  <p className="text-xs text-muted-foreground font-medium truncate">{s.organization}</p>
                )}

                {(s.email || s.phone) && (
                  <div className="space-y-0.5 pt-0.5">
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </a>
                    )}
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.phone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
