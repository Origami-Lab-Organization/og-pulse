import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageReader } from './MessageReader';

interface MessageDetailDialogProps {
  messageId: string | null;
  onOpenChange: (open: boolean) => void;
}

/** E-mail aberto numa janela por cima — usado onde não cabe a coluna de leitura. */
export function MessageDetailDialog(props: MessageDetailDialogProps) {
  const { messageId, onOpenChange } = props;

  return (
    <Dialog open={Boolean(messageId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex max-h-[85vh] flex-col">
        {messageId && (
          <MessageReader
            messageId={messageId}
            renderTitle={(subject) => (
              <DialogHeader>
                <DialogTitle className="pr-6">{subject}</DialogTitle>
              </DialogHeader>
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
