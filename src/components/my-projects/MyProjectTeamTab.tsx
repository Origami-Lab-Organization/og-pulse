import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  employeeId: string;
  nome: string;
  cargo: string;
  fotoUrl: string | null;
  role: string;
  hoursPerMonth: number;
}

interface MyProjectTeamTabProps {
  members: TeamMember[];
  currentEmployeeId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function MyProjectTeamTab({ members, currentEmployeeId }: MyProjectTeamTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Membros da Equipe
          <span className="text-xs text-muted-foreground font-normal">
            ({members.length} {members.length === 1 ? 'membro' : 'membros'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum membro alocado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {members.map((member) => {
              const isCurrentUser = member.employeeId === currentEmployeeId;
              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    isCurrentUser
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-muted/20'
                  )}
                >
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                    {member.fotoUrl && (
                      <AvatarImage src={member.fotoUrl} alt={member.nome} />
                    )}
                    <AvatarFallback
                      className={cn(
                        'text-sm font-medium',
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {getInitials(member.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium leading-none truncate">{member.nome}</p>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium shrink-0 leading-tight">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.cargo}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 truncate">{member.role}</p>
                    <p className="text-xs font-medium mt-1">{member.hoursPerMonth}h/mês</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
