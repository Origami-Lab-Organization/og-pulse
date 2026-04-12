import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRelease } from '@/hooks/useProjectReleases';

interface CreateReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateReleaseDialog({
  open,
  onOpenChange,
  projectId,
}: CreateReleaseDialogProps) {
  const createRelease = useCreateRelease();

  const [name,        setName]        = useState('');
  const [version,     setVersion]     = useState('');
  const [description, setDescription] = useState('');
  const [targetDate,  setTargetDate]  = useState('');

  const reset = () => {
    setName('');
    setVersion('');
    setDescription('');
    setTargetDate('');
  };

  const handleSubmit = () => {
    if (!name.trim() || !targetDate) return;
    createRelease.mutate(
      {
        projectId,
        name:        name.trim(),
        version:     version.trim() || undefined,
        description: description.trim() || undefined,
        targetDate,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nova Release</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Release Alpha"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Versão</Label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Data alvo *</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos desta release..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !targetDate || createRelease.isPending}
          >
            {createRelease.isPending ? 'Criando...' : 'Criar release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
