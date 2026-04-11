// ACT-15 — Bloqueio de card
import { AlertOctagon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CardBlockSectionProps {
  isBlocked: boolean;
  blockedReason: string;
  disabled?: boolean;
  onBlockedChange: (value: boolean) => void;
  onReasonChange: (value: string) => void;
}

export function CardBlockSection({
  isBlocked,
  blockedReason,
  disabled,
  onBlockedChange,
  onReasonChange,
}: CardBlockSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch
          id="is-blocked"
          checked={isBlocked}
          onCheckedChange={onBlockedChange}
          disabled={disabled}
        />
        <Label
          htmlFor="is-blocked"
          className="flex items-center gap-1.5 cursor-pointer text-sm"
        >
          <AlertOctagon className="h-3.5 w-3.5 text-destructive" />
          Card bloqueado
        </Label>
      </div>

      {isBlocked && (
        <Textarea
          placeholder="Descreva o motivo do bloqueio..."
          value={blockedReason}
          onChange={(e) => onReasonChange(e.target.value)}
          disabled={disabled}
          rows={2}
          className="text-sm resize-none"
        />
      )}
    </div>
  );
}
