import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OKRItem {
  id: string;
  objective: string;
  keyResults: { description: string; progress: number }[];
}

interface MyProjectOKRsTabProps {
  okrs: OKRItem[];
}

function krColor(progress: number): string {
  if (progress >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (progress >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function krBarColor(progress: number): string {
  if (progress >= 70) return 'bg-emerald-500 dark:bg-emerald-400';
  if (progress >= 40) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-destructive';
}

export function MyProjectOKRsTab({ okrs }: MyProjectOKRsTabProps) {
  if (okrs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Nenhum OKR definido</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Os objetivos e resultados-chave deste projeto ainda não foram cadastrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {okrs.map((okr, idx) => {
        const avgProgress =
          okr.keyResults.length > 0
            ? Math.round(
                okr.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / okr.keyResults.length
              )
            : 0;

        return (
          <Card key={okr.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                    Objetivo {idx + 1}
                  </p>
                  <CardTitle className="text-base font-semibold leading-snug">
                    {okr.objective}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            {okr.keyResults.length > 0 && (
              <CardContent className="pt-0 space-y-4">
                <div className="border-t pt-3 space-y-4">
                  {okr.keyResults.map((kr, krIdx) => (
                    <div key={krIdx} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-snug">
                          <span className="text-xs text-muted-foreground font-medium mr-1">
                            KR {krIdx + 1}:
                          </span>
                          {kr.description}
                        </p>
                        <span className={cn('text-sm font-bold shrink-0', krColor(kr.progress))}>
                          {kr.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            krBarColor(kr.progress)
                          )}
                          style={{ width: `${Math.min(100, kr.progress)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            <CardFooter className="pt-0 pb-4">
              <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Progresso médio</span>
                <span className={cn('font-semibold', krColor(avgProgress))}>
                  {avgProgress}%
                </span>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
