import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ClientForm from '@/components/clients/ClientForm';
import { Client, CreateClientInput } from '@/types/client';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSubmit: (data: CreateClientInput) => void;
  isLoading?: boolean;
}

// Invólucro de Dialog sobre o ClientForm — usado para criação inline (ex.: durante
// a criação de um orçamento). O fluxo principal de Clientes usa a tela ClientFormPage.
const ClientFormDialog = ({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading = false,
}: ClientFormDialogProps) => {
  const isEditing = !!client;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        {open && (
          <ClientForm
            client={client}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;
