import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checklistService } from '@/services/checklistService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { formatDate } from '@/lib/formatters';
import { ProjectWithRelations } from '@/types/project';
import {
  ActivityCardType,
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
import { useChecklistTemplates } from '@/hooks/useCardChecklist';
import { useQueryClient } from '@tanstack/react-query';

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
    const d = new Date(prevEndDate);
    d.setDate(d.getDate() + 1);
    start = d.toISOString().split('T')[0];
  }
  return { name: `Sprint ${index + 1}`, start_date: start, end_date: '', goal: '' };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ActivitySettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ActivitySettingsSheet({ open, onOpenChange, project }: ActivitySettingsSheetProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings }    = useActivitySettings(project.id);
  const { data: sprints = [] } = useActivitySprints(project.id);
  const { data: templates = [] } = useChecklistTemplates(project.id);
  const saveSettings  = useSaveActivitySettings();
  const createSprints = useCreateSprints();
  const [isSavingChecklists, setIsSavingChecklists] = useState(false);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'sprints' | 'wip' | 'checklists'>('sprints');

  // ── Sprint settings state ─────────────────────────────────────────────────
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [namingMode,    setNamingMode]    = useState<SprintNamingMode>('auto');
  const [startDate,     setStartDate]     = useState<Date | undefined>(undefined);
  const [sprintCount,   setSprintCount]   = useState(6);

  // ── WIP state ─────────────────────────────────────────────────────────────
  const [wipInDev,    setWipInDev]    = useState('');
  const [wipInTest,   setWipInTest]   = useState('');
  const [wipInDeploy, setWipInDeploy] = useState('');

  // ── Manual rows state ─────────────────────────────────────────────────────
  const [manualRows, setManualRows] = useState<SprintRow[]>([]);

  // ── Checklist template state ───────────────────────────────────────────────
  type CkKey = 'common' | ActivityCardType;
  const CK_KEYS: CkKey[] = ['common', 'story', 'bug', 'tech_debt', 'task'];
  const CK_LABELS: Record<CkKey, string> = {
    common:    'Comuns (todos os tipos)',
    story:     'História',
    bug:       'Bug',
    tech_debt: 'Dívida Técnica',
    task:      'Tarefa',
  };

  const emptyItems = (): Record<CkKey, string[]> => ({
    common: [''], story: [''], bug: [''], tech_debt: [''], task: [''],
  });

  const [dorItems, setDorItems] = useState<Record<CkKey, string[]>>(emptyItems);
  const [dodItems, setDodItems] = useState<Record<CkKey, string[]>>(emptyItems);

  // ── Initialize from loaded data ───────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setActiveTab('sprints');
      return;
    }
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

  useEffect(() => {
    if (!open) return;

    const loadByType = (checkType: 'dor' | 'dod'): Record<CkKey, string[]> => {
      const next = emptyItems();
      templates.filter((t) => t.type === checkType).forEach((t) => {
        const key: CkKey = (t.card_type as CkKey | null) ?? 'common';
        next[key] = t.items.length > 0 ? t.items.map((i) => i.text) : [''];
      });
      return next;
    };

    setDorItems(loadByType('dor'));
    setDodItems(loadByType('dod'));
  }, [templates, open]);

  const toItems = (arr: string[]) => arr.filter(Boolean).map((text) => ({ text }));

  // ── Date helpers for DatePicker ───────────────────────────────────────────────
  const strToDate = (s: string): Date | undefined => {
    if (!s) return undefined;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const dateToStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
      projectId:           project.id,
      sprintDurationWeeks: durationWeeks,
      sprintNamingMode:    namingMode,
      wipInDev:            wipInDev    !== '' ? Number(wipInDev)    : null,
      wipInTest:           wipInTest   !== '' ? Number(wipInTest)   : null,
      wipInDeploy:         wipInDeploy !== '' ? Number(wipInDeploy) : null,
    });
  };

  const handleSaveChecklists = async () => {
    if (!employee) return;
    setIsSavingChecklists(true);
    try {
      for (const key of CK_KEYS) {
        const cardType: ActivityCardType | null = key === 'common' ? null : key as ActivityCardType;
        await checklistService.upsertTemplate(project.id, employee.tenant_id, 'dor', cardType, toItems(dorItems[key]));
        await checklistService.upsertTemplate(project.id, employee.tenant_id, 'dod', cardType, toItems(dodItems[key]));
      }
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', project.id] });
      toast({ title: 'Checklists salvos' });
    } catch (err) {
      console.error('[checklist save]', err);
      toast({ title: 'Erro ao salvar checklists', variant: 'destructive' });
    } finally {
      setIsSavingChecklists(false);
    }
  };

  const handleSaveAll = () => {
    handleSaveSettings();
    handleSaveChecklists();
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

  const isSaving = saveSettings.isPending || isSavingChecklists;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
          <SheetTitle>Configurações do Board</SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="mx-6 mb-0 shrink-0 justify-start bg-transparent border-b rounded-none gap-1 h-auto pb-0">
            <TabsTrigger
              value="sprints"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 text-sm"
            >
              Sprints
            </TabsTrigger>
            <TabsTrigger
              value="wip"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 text-sm"
            >
              Limites WIP
            </TabsTrigger>
            <TabsTrigger
              value="checklists"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 text-sm"
            >
              Checklists
            </TabsTrigger>
          </TabsList>

          {/* ── Sprints ── */}
          <TabsContent value="sprints" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-4">

                <div className="space-y-1.5">
                  <Label className="text-xs">Duração da sprint</Label>
                  <Select value={String(durationWeeks)} onValueChange={(v) => setDurationWeeks(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 semana</SelectItem>
                      <SelectItem value="2">2 semanas</SelectItem>
                      <SelectItem value="3">3 semanas</SelectItem>
                      <SelectItem value="4">4 semanas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Data de início</Label>
                  <DatePicker value={startDate} onChange={setStartDate} placeholder="Selecionar data de início" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Modo de nomeação</Label>
                  <RadioGroup
                    value={namingMode}
                    onValueChange={(v) => setNamingMode(v as SprintNamingMode)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="auto" id="mode-auto" />
                      <Label htmlFor="mode-auto" className="text-sm font-normal cursor-pointer">Automático</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="manual" id="mode-manual" />
                      <Label htmlFor="mode-manual" className="text-sm font-normal cursor-pointer">Manual</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Auto mode */}
                {namingMode === 'auto' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade de sprints</Label>
                      <Select value={String(sprintCount)} onValueChange={(v) => setSprintCount(Number(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[4, 6, 8, 10, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} sprints</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                                <td className="py-1.5 px-3 text-muted-foreground">{formatDate(s.start_date)}</td>
                                <td className="py-1.5 px-3 text-muted-foreground">{formatDate(s.end_date)}</td>
                                <td className="py-1.5 px-3">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_CLASS[s.status]}`}>
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

                {/* Manual mode */}
                {namingMode === 'manual' && (
                  <div className="space-y-3">
                    {manualRows.map((row, idx) => (
                      <div key={idx} className="rounded-md border p-3 space-y-2.5">
                        {/* Nome + remover */}
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.name}
                            onChange={(e) => updateRow(idx, { name: e.target.value })}
                            className="h-8 text-sm flex-1"
                            placeholder="Nome da sprint"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(idx)}
                            disabled={manualRows.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Início + Fim */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Início</Label>
                            <DatePicker
                              value={strToDate(row.start_date)}
                              onChange={(d) => d && updateRow(idx, { start_date: dateToStr(d) })}
                              placeholder="Data de início"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Fim</Label>
                            <DatePicker
                              value={strToDate(row.end_date)}
                              onChange={(d) => d && updateRow(idx, { end_date: dateToStr(d) })}
                              placeholder="Data de fim"
                            />
                          </div>
                        </div>

                        {/* Goal */}
                        <Input
                          value={row.goal}
                          onChange={(e) => updateRow(idx, { goal: e.target.value })}
                          placeholder="Objetivo da sprint (opcional)"
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={addRow}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar sprint
                      </Button>
                      <Button size="sm" disabled={createSprints.isPending} onClick={handleSaveManual}>
                        {createSprints.isPending ? 'Salvando...' : 'Salvar sprints'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Limites WIP ── */}
          <TabsContent value="wip" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para sem limite.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">In Dev</Label>
                    <Input type="number" min={1} value={wipInDev} onChange={(e) => setWipInDev(e.target.value)} placeholder="Sem limite" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">In Test</Label>
                    <Input type="number" min={1} value={wipInTest} onChange={(e) => setWipInTest(e.target.value)} placeholder="Sem limite" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">In Deploy</Label>
                    <Input type="number" min={1} value={wipInDeploy} onChange={(e) => setWipInDeploy(e.target.value)} placeholder="Sem limite" className="h-9" />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Checklists ── */}
          <TabsContent value="checklists" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-6 py-5 space-y-5">

                {/* DoR — per card type */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Definition of Ready (DoR)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Critérios que um card deve atender antes de entrar no Sprint Backlog.
                    </p>
                  </div>

                  {CK_KEYS.map((key) => (
                    <div key={key} className="space-y-1.5 pl-3 border-l-2 border-border">
                      <p className="text-xs font-medium text-muted-foreground">{CK_LABELS[key]}</p>
                      <Textarea
                        value={dorItems[key].join('\n')}
                        onChange={(e) =>
                          setDorItems((prev) => ({ ...prev, [key]: e.target.value.split('\n') }))
                        }
                        placeholder="Um critério por linha..."
                        className="text-xs resize-none min-h-[72px]"
                        rows={Math.max(3, dorItems[key].filter(Boolean).length + 1)}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* DoD — per card type */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Definition of Done (DoD)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Critérios que um card deve atender para ser considerado concluído.
                    </p>
                  </div>

                  {CK_KEYS.map((key) => (
                    <div key={key} className="space-y-1.5 pl-3 border-l-2 border-border">
                      <p className="text-xs font-medium text-muted-foreground">{CK_LABELS[key]}</p>
                      <Textarea
                        value={dodItems[key].join('\n')}
                        onChange={(e) =>
                          setDodItems((prev) => ({ ...prev, [key]: e.target.value.split('\n') }))
                        }
                        placeholder="Um critério por linha..."
                        className="text-xs resize-none min-h-[72px]"
                        rows={Math.max(3, dodItems[key].filter(Boolean).length + 1)}
                      />
                    </div>
                  ))}
                </div>

              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <SheetFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
