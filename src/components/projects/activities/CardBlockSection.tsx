import { useState, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CardBlockSectionProps {
  initialBlocked: boolean;
  initialReason: string | null;
  disabled?: boolean;
  onSave: (isBlocked: boolean, reason: string | null) => void;
}

export function CardBlockSection({
  initialBlocked,
  initialReason,
  disabled = false,
  onSave,
}: CardBlockSectionProps) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [reason, setReason]   = useState(initialReason ?? '');
  const [error, setError]     = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlockedChange = (val: boolean) => {
    if (val) {
      // Turning ON: show textarea via animation, then focus
      setBlocked(true);
      setError('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      // Turning OFF: clear reason, save immediately
      setBlocked(false);
      setReason('');
      setError('');
      onSave(false, null);
    }
  };

  const handleBlur = () => {
    if (!blocked) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Descreva o impedimento para salvar.');
      return;
    }
    setError('');
    onSave(true, trimmed);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          id="is-blocked"
          checked={blocked}
          onCheckedChange={handleBlockedChange}
          disabled={disabled}
        />
        <Label
          htmlFor="is-blocked"
          className="flex items-center gap-1.5 cursor-pointer text-sm"
        >
          <ShieldAlert
            className={cn(
              'h-3.5 w-3.5 transition-colors',
              blocked ? 'text-destructive' : 'text-muted-foreground'
            )}
          />
          Card bloqueado
        </Label>
      </div>

      {/* Animated container */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          blocked ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <Textarea
          ref={textareaRef}
          placeholder="Descreva o impedimento..."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error && e.target.value.trim()) setError('');
          }}
          onBlur={handleBlur}
          disabled={disabled}
          rows={2}
          className={cn(
            'text-sm resize-none',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
