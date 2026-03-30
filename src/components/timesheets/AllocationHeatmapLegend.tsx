import { cn } from '@/lib/utils';

const LEGEND_ITEMS = [
  { label: '> 100%', description: 'Sobrealocado', className: 'bg-red-100 dark:bg-red-900/30' },
  { label: '91–100%', description: 'Adequado', className: 'bg-green-100 dark:bg-green-900/30' },
  { label: '80–90%', description: 'Atenção', className: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { label: '1–79%', description: 'Subalocado', className: 'bg-orange-100 dark:bg-orange-900/30' },
  { label: '0%', description: 'Ocioso', className: 'bg-muted/40' },
] as const;

export function AllocationHeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">Legenda:</span>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn('inline-block h-3 w-3 rounded-sm border border-border', item.className)} />
          <span>{item.label} {item.description}</span>
        </div>
      ))}
    </div>
  );
}
