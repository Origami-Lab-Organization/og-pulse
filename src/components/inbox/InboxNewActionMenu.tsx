import { Plus, DollarSign, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  onReimbursementClick: () => void;
}

export function InboxNewActionMenu({ onReimbursementClick }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova ação
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onReimbursementClick} className="gap-2 cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-green-100 dark:bg-green-900/30">
            <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
          Pedido de reembolso
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
            <Palmtree className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-muted-foreground">Pedido de férias</span>
          <span className="ml-auto text-[10px] text-muted-foreground">(Em breve)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
