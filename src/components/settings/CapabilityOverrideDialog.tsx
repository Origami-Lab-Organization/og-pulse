/**
 * Nova exceção de capacidade para uma pessoa (PUL-210).
 *
 * O formulário deixa explícito o que o perfil da pessoa já faz, porque a decisão de
 * conceder ou revogar só faz sentido contra esse fundo: conceder o que o perfil já concede
 * é redundante, revogar o que ele não concede não muda nada.
 *
 * A própria pessoa não aparece na lista: a policy recusa `user_id = auth.uid()`, e oferecer
 * uma opção que o banco nega é pior que não oferecer.
 */
import { useMemo, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DOMAIN_LABELS,
  type CapabilityGroup,
  type PersonWithRole,
  type TenantRoleWithUsage,
} from '@/types/accessProfile';

/** Motivo curto demais não é motivo — quem lê em seis meses precisa entender a decisão. */
const MIN_REASON = 10;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: PersonWithRole[];
  roles: TenantRoleWithUsage[];
  capabilityGroups: CapabilityGroup[];
  /** `role_id::capability` das células ligadas — diz o que o perfil da pessoa já concede. */
  roleGrants: ReadonlySet<string>;
  /** Conta de quem está usando a tela: não pode receber exceção de si mesma. */
  currentUserId: string | null;
  saving: boolean;
  onSave: (input: { userId: string; capability: string; enabled: boolean; reason: string }) => void;
}

export function CapabilityOverrideDialog({
  open,
  onOpenChange,
  people,
  roles,
  capabilityGroups,
  roleGrants,
  currentUserId,
  saving,
  onSave,
}: Props) {
  const [userId, setUserId] = useState('');
  const [capability, setCapability] = useState('');
  const [mode, setMode] = useState<'grant' | 'revoke'>('grant');
  const [reason, setReason] = useState('');

  const selectable = useMemo(
    () => people.filter((p) => p.userId !== currentUserId && p.status !== 'arquivado'),
    [people, currentUserId],
  );

  const person = selectable.find((p) => p.userId === userId) ?? null;
  const roleName = roles.find((r) => r.id === person?.roleId)?.name ?? null;
  const grantedByRole = !!person?.roleId && roleGrants.has(`${person.roleId}::${capability}`);

  const reasonTooShort = reason.trim().length < MIN_REASON;
  const canSave = !!userId && !!capability && !reasonTooShort && !saving;

  const reset = () => {
    setUserId('');
    setCapability('');
    setMode('grant');
    setReason('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova exceção de acesso</DialogTitle>
          <DialogDescription>
            A exceção vale sobre o perfil da pessoa e passa a valer no banco, não só na tela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="override-person">Pessoa</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="override-person">
                <SelectValue placeholder="Escolha quem recebe a exceção" />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.nome}
                    {p.cargo ? ` · ${p.cargo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Você não aparece na lista: ninguém altera o próprio acesso, nem sendo admin.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-capability">Capacidade</Label>
            <Select value={capability} onValueChange={setCapability}>
              <SelectTrigger id="override-capability">
                <SelectValue placeholder="Escolha a capacidade" />
              </SelectTrigger>
              <SelectContent>
                {capabilityGroups.map((group) => (
                  <SelectGroup key={group.domain}>
                    <SelectLabel>{DOMAIN_LABELS[group.domain] ?? group.domain}</SelectLabel>
                    {group.capabilities.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>O que a exceção faz</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'grant' | 'revoke')}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="grant" id="override-grant" className="mt-0.5" />
                <Label htmlFor="override-grant" className="font-normal leading-snug">
                  Concede — a pessoa passa a ter, mesmo que o perfil dela não conceda
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="revoke" id="override-revoke" className="mt-0.5" />
                <Label htmlFor="override-revoke" className="font-normal leading-snug">
                  Revoga — a pessoa perde, mesmo que o perfil dela conceda
                </Label>
              </div>
            </RadioGroup>
          </div>

          {person && capability ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {grantedByRole ? (
                  <>
                    O perfil <strong>{roleName ?? 'sem perfil'}</strong> já concede esta capacidade.
                    {mode === 'grant'
                      ? ' A exceção não muda nada hoje — e continua valendo se o perfil mudar.'
                      : ' Revogar aqui retira só desta pessoa.'}
                  </>
                ) : (
                  <>
                    O perfil <strong>{roleName ?? 'sem perfil'}</strong> não concede esta capacidade.
                    {mode === 'grant'
                      ? ' A exceção é o que vai dar o acesso.'
                      : ' A exceção não muda nada hoje — e continua valendo se o perfil mudar.'}
                  </>
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="override-reason">Motivo</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Por que esta pessoa precisa fugir do perfil? Quem autorizou, e até quando vale."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Obrigatório. Exceção sem motivo registrado é o que ninguém consegue revisar depois.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave({ userId, capability, enabled: mode === 'grant', reason })}
            disabled={!canSave}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registrar exceção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
