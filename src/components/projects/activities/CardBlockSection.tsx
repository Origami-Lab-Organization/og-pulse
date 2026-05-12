import { useRef, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CardBlockSectionProps {
  blocked: boolean;
  reason: string;
  disabled?: boolean;
  onChange: (blocked: boolean, reason: string) => void;
  error?: string;
}

export function CardBlockSection({
  blocked,
  reason,
  disabled = false,
  onChange,
  error,
}: CardBlockSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasBlockedRef = useRef(blocked);

  useEffect(() => {
    if (!wasBlockedRef.current && blocked) {
      // Just turned on — focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
    wasBlockedRef.current = blocked;
  }, [blocked]);

  const handleBlockedChange = (val: boolean) => {
    if (val) {
      onChange(true, reason);
    } else {
      onChange(false, '');
    }
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
          onChange={(e) => onChange(blocked, e.target.value)}
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
