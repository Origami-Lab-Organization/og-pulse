import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, CalendarOff } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useRegisterAbsencePeriod, type AbsenceType } from '@/hooks/useAbsencePeriod';
import { useToast } from '@/hooks/use-toast';

const TIPO_OPTIONS: { value: AbsenceType; label: string; hint: string }[] = [
  { value: 'ferias', label: 'Férias', hint: 'Neutro — sem impacto no banco de horas.' },
  { value: 'atestado', label: 'Atestado', hint: 'Neutro — sem impacto no banco de horas.' },
  { value: 'falta', label: 'Falta', hint: 'Debita a jornada diária do colaborador no banco de horas.' },
];

export function RegisterAbsenceDialog() {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<AbsenceType>('ferias');
  const [employeeId, setEmployeeId] = useState('');
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');

  const { data: employees } = useEmployees();
  const registerAbsence = useRegisterAbsencePeriod();
  const { toast } = useToast();

  const resetForm = () => {
    setTipo('ferias');
    setEmployeeId('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setDataFim(new Date().toISOString().split('T')[0]);
    setMotivo('');
  };

  const handleSubmit = () => {
    if (!employeeId) {
      toast({ title: 'Selecione o colaborador', variant: 'destructive' });
      return;
    }
    if (dataFim < dataInicio) {
      toast({ title: 'Período inválido', description: 'A data final não pode ser anterior à data inicial.', variant: 'destructive' });
      return;
    }

    registerAbsence.mutate(
      { tipo, employeeId, dataInicio, dataFim, motivo: motivo.trim() || undefined },
      { onSuccess: () => { setOpen(false); resetForm(); } },
    );
  };

  const selectedOption = TIPO_OPTIONS.find((opt) => opt.value === tipo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarOff className="mr-2 h-4 w-4" />
          Lançar ausência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar ausência</DialogTitle>
          <DialogDescription>
            Registra o período direto no ponto do colaborador — sem passar por solicitação/aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as AbsenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">{selectedOption.hint}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {(employees || []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="absence-inicio">De</Label>
              <Input id="absence-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-fim">Até</Label>
              <Input id="absence-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="absence-motivo">Observação (opcional)</Label>
            <Textarea
              id="absence-motivo"
              placeholder="Ex: referente ao período aquisitivo 2025/2026"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={registerAbsence.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={registerAbsence.isPending}>
            {registerAbsence.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
