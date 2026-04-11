import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { ProjectWithRelations } from '@/types/project';
import {
  ActivitySprintDB,
  SprintNamingMode,
  SprintStatus,
  generateSprints,
} from '@/types/projectActivity';
import {
  useActivitySprints,
  useActivitySettings,
  useCreateSprints,
  useSaveActivitySettings,
} from '@/hooks/useActivitySprints';
import {
  useChecklistTemplates,
  useSaveChecklistTemplate,
} from '@/hooks/useCardChecklist';

// ── Sprint status badge ───────────────────────────────────────────────────────
const STATUS_LABEL: Record<SprintStatus, string> = {
  planned:   'Planejada',
  active:    'Ativa',
  completed: 'Concluída',
};
const STATUS_CLASS: Record<SprintStatus, string> = {
  planned:   'bg-gray-100 text-gray-700 border-gray-200',
  active:    'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
};

// ── Manual sprint row ─────────────────────────────────────────────────────────
interface SprintRow {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  goal: string;
}

function newEmptyRow(index: number, prevEndDate?: string): SprintRow {
  let start = '';
  if (prevEndDate) {
    // start = prevEnd + 1 day
    const d = new Date(prevEndDate);
    d.setDate(d.getDate() + 1);
    start = d.toISOString().split('T')[0];
  }
  return { name: `Sprint ${index + 1}`, start_date: start, end_date: '', goal: '' };
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ActivitySettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ActivitySettingsSheet({ open, onOpenChange, project }: ActivitySettingsSheetProps) {
  const { data: settings } = useActivitySettings(project.id);
  const { data: sprints = [] }  = useActivitySprints(project.id);
  const { data: templates = [] } = useChecklistTemplates(project.id);
  const saveSettings  = useSaveActivitySettings();
  const createSprints = useCreateSprints();
  const saveTemplate  = useSaveChecklistTemplate();

  // ── Sprint settings state ──────────────────────────────────────────────────
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [namingMode, setNamingMode]       = useState<SprintNamingMode>('auto');
  const [startDate, setStartDate]         = useState<Date | undefined>(undefined);
  const [sprintCount, setSprintCount]     = useState(6);

  // ── WIP state ─────────────────────────────────────────────────────────────
  const [wipInDev,    setWipInDev]    = useState('');
  const [wipInTest,   setWipInTest]   = useState('');
  const [wipInDeploy, setWipInDeploy] = useState('');

  // ── Manual rows state ─────────────────────────────────────────────────────
  const [manualRows, setManualRows] = useState<SprintRow[]>([]);

  // ── Checklist template state ───────────────────────────────────────────────
  const [dorItems, setDorItems] = useState<string[]>(['']);
  const [dodItems, setDodItems] = useState<string[]>(['']);

  // ── Initialize from loaded data ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (settings) {
      setDurationWeeks(settings.sprint_duration_weeks);
      setNamingMode(settings.sprint_naming_mode);
      setWipInDev(settings.wip_in_dev?.toString() ?? '');
      setWipInTest(settings.wip_in_test?.toString() ?? '');
      setWipInDeploy(settings.wip_in_deploy?.toString() ?? '');
    }
  }, [settings, open]);

  useEffect(() => {
    if (!open) return;
    if (sprints.length > 0) {
      setManualRows(
        sprints.map((s: ActivitySprintDB) => ({
          id:         s.id,
          name:       s.name,
          start_date: s.start_date,
          end_date:   s.end_date,
          goal:       s.goal ?? '',
        }))
      );
    } else {
      setManualRows([newEmptyRow(0)]);
    }
  }, [sprints, open]);

  // Initialize checklist templates
  useEffect(() => {
    if (!open) return;
    const dor = templates.find((t) => t.type === 'dor');
    const dod = templates.find((t) => t.type === 'dod');
    setDorItems(dor && dor.items.length > 0 ? dor.items.map((i) => i.text) : ['']);
    setDodItems(dod && dod.items.length > 0 ? dod.items.map((i) => i.text) : ['']);
  }, [templates, open]);

  // ── Checklist helpers ─────────────────────────────────────────────────────
  const makeUpdater = (setter: React.Dispatch<React.SetStateAction<string[]>>) => ({
    update: (idx: number, val: string) =>
      setter((prev) => prev.map((v, i) => (i === idx ? val : v))),
    remove: (idx: number) =>
      setter((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev),
    add: () =>
      setter((prev) => [...prev, '']),
  });

  const dorCtrl = makeUpdater(setDorItems);
  const dodCtrl = makeUpdater(setDodItems);

  const handleSaveChecklists = () => {
    const toItems = (arr: string[]) => arr.filter(Boolean).map((text) => ({ text }));
    saveTemplate.mutate({ projectId: project.id, type: 'dor', items: toItems(dorItems) });
    saveTemplate.mutate({ projectId: project.id, type: 'dod', items: toItems(dodItems) });
  };

  // ── Auto preview ──────────────────────────────────────────────────────────
  const previewSprints = useMemo(() => {
    if (!startDate) return [];
    return generateSprints(startDate, durationWeeks, sprintCount);
  }, [startDate, durationWeeks, sprintCount]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleConfirmAuto = () => {
    if (previewSprints.length === 0) return;
    createSprints.mutate({ projectId: project.id, sprints: previewSprints });
  };

  const handleSaveManual = () => {
    const rows: typeof previewSprints = manualRows
      .filter((r) => r.name && r.start_date && r.end_date)
      .map((r, i) => {
        const start = r.start_date;
        const end   = r.end_date;
        const today = new Date().toISOString().split('T')[0];
        const status: SprintStatus =
          start <= today && today <= end ? 'active' : 'planned';
        return { name: r.name, number: i + 1, start_date: start, end_date: end, status, goal: r.goal };
      });
    createSprints.mutate({ projectId: project.id, sprints: rows });
  };

  const handleSaveSettings = () => {
    saveSettings.mutate({
      projectId:          project.id,
      sprintDurationWeeks: durationWeeks,
      sprintNamingMode:   namingMode,
      wipInDev:           wipInDev !== '' ? Number(wipInDev) : null,
      wipInTest:          wipInTest !== '' ? Number(wipInTest) : null,
      wipInDeploy:        wipInDeploy !== '' ? Number(wipInDeploy) : null,
    });
  };

  // Manual row helpers
  const updateRow = (idx: number, patch: Partial<SprintRow>) =>
    setManualRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) =>
    setManualRows((prev) => prev.filter((_, i) => i !== idx));

  const addRow = () => {
    setManualRows((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, newEmptyRow(prev.length, last?.end_date)];
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
          <SheetTitle>Configurações do Board</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 pb-6 space-y-6">

            {/* ── Sprints ── */}
            <Section title="Sprints">

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs">Duração da sprint</Label>
                <Select
                  value={String(durationWeeks)}
                  onValueChange={(v) => setDurationWeeks(Number(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 semana</SelectItem>
                    <SelectItem value="2">2 semanas</SelectItem>
                    <SelectItem value="3">3 semanas</SelectItem>
                    <SelectItem value="4">4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start date */}
              <div className="space-y-1.5">
                <Label className="text-xs">Data de início</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Selecionar data de início"
                />
              </div>

              {/* Naming mode */}
              <div className="space-y-2">
                <Label className="text-xs">Modo de nomeação</Label>
                <RadioGroup
                  value={namingMode}
                  onValueChange={(v) => setNamingMode(v as SprintNamingMode)}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="auto" id="mode-auto" />
                    <Label htmlFor="mode-auto" className="text-sm font-normal cursor-pointer">
                      Automático
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="manual" id="mode-manual" />
                    <Label htmlFor="mode-manual" className="text-sm font-normal cursor-pointer">
                      Manual
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* ── Auto mode ── */}
              {namingMode === 'auto' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade de sprints</Label>
                    <Select
                      value={String(sprintCount)}
                      onValueChange={(v) => setSprintCount(Number(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 6, 8, 10, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} sprints</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  {previewSprints.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/60 border-b">
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">#</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Nome</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Início</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Fim</th>
                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewSprints.map((s) => (
                            <tr key={s.number} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="py-1.5 px-3 text-muted-foreground">{s.number}</td>
                              <td className="py-1.5 px-3 font-medium">{s.name}</td>
                              <td className="py-1.5 px-3 text-muted-foreground">{s.start_date}</td>
                              <td className="py-1.5 px-3 text-muted-foreground">{s.end_date}</td>
                              <td className="py-1.5 px-3">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${STATUS_CLASS[s.status]}`}
                                >
                                  {STATUS_LABEL[s.status]}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!startDate && (
                    <p className="text-xs text-muted-foreground">
                      Selecione a data de início para ver o preview.
                    </p>
                  )}

                  <Button
                    size="sm"
                    disabled={previewSprints.length === 0 || createSprints.isPending}
                    onClick={handleConfirmAuto}
                  >
                    {createSprints.isPending ? 'Gerando...' : 'Confirmar geração'}
                  </Button>
                </div>
              )}

              {/* ── Manual mode ── */}
              {namingMode === 'manual' && (
                <div className="space-y-3">
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/60 border-b">
                          <th className="py-2 px-2 text-left font-medium text-muted-foreground">Nome</th>
                          <th className="py-2 px-2 text-left font-medium text-muted-foreground">Início</th>
                          <th className="py-2 px-2 text-left font-medium text-muted-foreground">Fim</th>
                          <th className="py-2 px-2 text-left font-medium text-muted-foreground">Goal</th>
                          <th className="py-2 px-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {manualRows.map((row, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-1 px-1">
                              <Input
                                value={row.name}
                                onChange={(e) => updateRow(idx, { name: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="date"
                                value={row.start_date}
                                onChange={(e) => updateRow(idx, { start_date: e.target.value })}
                                className="h-7 text-xs w-32"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="date"
                                value={row.end_date}
                                onChange={(e) => updateRow(idx, { end_date: e.target.value })}
                                className="h-7 text-xs w-32"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                value={row.goal}
                                onChange={(e) => updateRow(idx, { goal: e.target.value })}
                                placeholder="Opcional"
                                className="h-7 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRow(idx)}
                                disabled={manualRows.length <= 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addRow}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Adicionar linha
                    </Button>
                    <Button
                      size="sm"
                      disabled={createSprints.isPending}
                      onClick={handleSaveManual}
                    >
                      {createSprints.isPending ? 'Salvando...' : 'Salvar sprints'}
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            <Separator />

            {/* ── WIP ── */}
            <Section title="Limites WIP">
              <p className="text-xs text-muted-foreground -mt-2">
                Deixe em branco para sem limite.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">In Dev</Label>
                  <Input
                    type="number"
                    min={1}
                    value={wipInDev}
                    onChange={(e) => setWipInDev(e.target.value)}
                    placeholder="Sem limite"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">In Test</Label>
                  <Input
                    type="number"
                    min={1}
                    value={wipInTest}
                    onChange={(e) => setWipInTest(e.target.value)}
                    placeholder="Sem limite"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">In Deploy</Label>
                  <Input
                    type="number"
                    min={1}
                    value={wipInDeploy}
                    onChange={(e) => setWipInDeploy(e.target.value)}
                    placeholder="Sem limite"
                    className="h-9"
                  />
                </div>
              </div>
            </Section>

            <Separator />

            {/* ── Checklists ── */}
            <Section title="Checklists">

              {/* DoR */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Definition of Ready (DoR)</Label>
                {dorItems.map((text, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={text}
                      onChange={(e) => dorCtrl.update(idx, e.target.value)}
                      placeholder={`Critério ${idx + 1}`}
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => dorCtrl.remove(idx)}
                      disabled={dorItems.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => dorCtrl.add()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar critério
                </button>
              </div>

              <Separator className="my-1" />

              {/* DoD */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Definition of Done (DoD)</Label>
                {dodItems.map((text, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={text}
                      onChange={(e) => dodCtrl.update(idx, e.target.value)}
                      placeholder={`Critério ${idx + 1}`}
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => dodCtrl.remove(idx)}
                      disabled={dodItems.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => dodCtrl.add()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar critério
                </button>
              </div>

              <Button
                size="sm"
                onClick={handleSaveChecklists}
                disabled={saveTemplate.isPending}
              >
                {saveTemplate.isPending ? 'Salvando...' : 'Salvar checklists'}
              </Button>

            </Section>

          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSaveSettings} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
