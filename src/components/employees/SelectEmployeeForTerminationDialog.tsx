import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useEmployees, Employee } from '@/hooks/useEmployees';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (employee: Employee) => void;
}

export function SelectEmployeeForTerminationDialog({ open, onOpenChange, onSelect }: Props) {
  const { data: employees = [] } = useEmployees();

  const eligible = useMemo(
    () => employees.filter((e) => e.status === 'ativo' && !e.terminationId),
    [employees],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Novo Desligamento</DialogTitle>
          <DialogDescription>Selecione o funcionário a ser desligado.</DialogDescription>
        </DialogHeader>
        <Command className="mt-2">
          <CommandInput placeholder="Buscar por nome..." />
          <CommandList className="max-h-72 overflow-y-auto p-2">
            <CommandEmpty>Nenhum funcionário ativo encontrado.</CommandEmpty>
            <CommandGroup>
              {eligible.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={employee.nome}
                  onSelect={() => {
                    onSelect(employee);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{employee.nome}</span>
                    <span className="text-xs text-muted-foreground">{employee.cargo}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
