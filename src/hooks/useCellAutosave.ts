import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Motor de auto-save de células de timesheet — fonte de verdade única.
 *
 * Extraído verbatim de TimesheetWeekRow, para que a linha de projeto, a linha
 * de atividade e a nova grade de lançamento compartilhem exatamente a mesma
 * lógica sensível: debounce (2s), flush no blur, retry (5s), proteção anti-flick
 * (editedValuesRef), cap de horas/dia e guard offline.
 *
 * NÃO contém apresentação. Cada linha decide como renderizar a célula a partir
 * do estado retornado.
 */

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
export interface SaveStatusInfo {
  status: SaveStatus;
  lastSavedAt?: Date;
}

const DEBOUNCE_MS = 2000;
const RETRY_MS = 5000;

export interface UseCellAutosaveOptions {
  /** Identificador reportado nos callbacks (memberId ou activityTypeId). */
  id: string;
  /** Datas (ISO yyyy-MM-dd) da semana, em ordem. */
  dates: string[];
  /**
   * Horas do lançamento salvo por data. Chave presente = há lançamento (inclusive
   * 0); chave ausente = sem lançamento. DEVE ser um objeto estável (memoizado pelo
   * chamador) — a reconciliação depende dele.
   */
  entryHours: Record<string, number>;
  /** Sugestão por data (pré-preenchimento). Só aparece em células vazias. */
  suggestions?: Record<string, number>;
  /** Persiste o valor de uma data no backend. */
  persist: (date: string, hours: number) => Promise<unknown>;
  isOnline: boolean;
  /** Máximo de horas por dia (default 12). */
  maxHours?: number;
  /** Mensagem de erro ao exceder o máximo (default padrão). */
  onExceedMax?: (max: number) => void;
  /** Bloqueia edição e avisa quando offline (linha de projeto). Default false. */
  onOfflineBlocked?: () => void;
  /** Habilita a lógica de sugestão/tracejado (linha de projeto). Default false. */
  trackSuggestions?: boolean;
  onLocalTotalChange?: (id: string, total: number) => void;
  onLocalDayHoursChange?: (id: string, dayHours: Record<string, number>) => void;
  /** Reporta só valores REAIS (entry salvo ou edição do usuário), sem sugestões. */
  onRealValuesChange?: (id: string, real: Record<string, number>) => void;
  onSaveStatusChange?: (id: string, info: SaveStatusInfo) => void;
}

export interface UseCellAutosaveResult {
  hours: Record<string, number>;
  pendingSaves: Set<string>;
  suggestedDates: Set<string>;
  saveStatus: SaveStatus;
  totalHours: number;
  /** Nova entrada do usuário. `value` é string (parseFloat + arredonda a 0.1). */
  handleHoursChange: (date: string, value: string) => void;
  handleBlur: (date: string) => void;
  /** True quando a data mostra uma sugestão (célula vazia planejada, sem edição). */
  isSuggested: (date: string) => boolean;
  /** True quando a data tem valor REAL (entry salvo ou edição do usuário). */
  isReal: (date: string) => boolean;
}

export function useCellAutosave(options: UseCellAutosaveOptions): UseCellAutosaveResult {
  const {
    id,
    dates,
    entryHours,
    suggestions = {},
    persist,
    isOnline,
    maxHours = 12,
    onExceedMax,
    onOfflineBlocked,
    trackSuggestions = false,
    onLocalTotalChange,
    onLocalDayHoursChange,
    onRealValuesChange,
    onSaveStatusChange,
  } = options;

  // Valores editados pelo usuário, mantidos até o servidor confirmar o mesmo
  // valor. Evita o "flick" em que a célula reverte para a sugestão/valor antigo
  // enquanto o refetch ainda não reflete o que acabou de ser salvo.
  const editedValuesRef = useRef<Map<string, number>>(new Map());

  // Célula vazia (sem lançamento salvo) que possui sugestão.
  const isSuggestedDate = useCallback(
    (date: string): boolean => {
      if (!trackSuggestions) return false;
      if (editedValuesRef.current.has(date)) return false; // usuário já tocou
      if ((suggestions[date] ?? 0) <= 0) return false;
      return entryHours[date] === undefined; // sugestão só em célula sem lançamento
    },
    [trackSuggestions, suggestions, entryHours]
  );

  const getInitialHours = useCallback(() => {
    const hours: Record<string, number> = {};
    dates.forEach((date) => {
      hours[date] = entryHours[date] ?? (suggestions[date] ?? 0);
    });
    return hours;
  }, [dates, entryHours, suggestions]);

  const getInitialSuggested = useCallback(() => {
    const set = new Set<string>();
    dates.forEach((date) => {
      if (isSuggestedDate(date)) set.add(date);
    });
    return set;
  }, [dates, isSuggestedDate]);

  const [hours, setHours] = useState<Record<string, number>>(getInitialHours);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [suggestedDates, setSuggestedDates] = useState<Set<string>>(getInitialSuggested);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const pendingSavesRef = useRef<Set<string>>(new Set());
  const hoursRef = useRef<Record<string, number>>(hours);
  const suggestedDatesRef = useRef<Set<string>>(getInitialSuggested());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pendingSavesRef.current = pendingSaves; }, [pendingSaves]);
  useEffect(() => { hoursRef.current = hours; }, [hours]);
  useEffect(() => { suggestedDatesRef.current = suggestedDates; }, [suggestedDates]);

  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const reportStatus = useCallback(
    (info: SaveStatusInfo) => {
      setSaveStatus(info.status);
      onSaveStatusChange?.(id, info);
    },
    [id, onSaveStatusChange]
  );

  // Atualiza horas quando entries/sugestões mudam, preservando edições em voo e
  // mantendo a sugestão nas células ainda vazias.
  useEffect(() => {
    const prev = hoursRef.current;
    const edited = editedValuesRef.current;
    const nextHours: Record<string, number> = {};
    const nextSuggested = new Set<string>();

    dates.forEach((date) => {
      const entry = entryHours[date];

      if (pendingSavesRef.current.has(date)) {
        nextHours[date] = prev[date] ?? 0; // edição em andamento (salvando)
      } else if (edited.has(date)) {
        const editedVal = edited.get(date)!;
        // Só liberamos o valor editado quando o servidor reflete exatamente ele.
        if (entry !== undefined && Math.round(entry * 10) === Math.round(editedVal * 10)) {
          edited.delete(date);
          nextHours[date] = entry;
        } else {
          nextHours[date] = editedVal; // mantém o que o usuário digitou
        }
      } else if (entry !== undefined) {
        nextHours[date] = entry; // lançamento salvo nunca é sobrescrito
      } else {
        nextHours[date] = suggestions[date] ?? 0; // sugestão ou vazio
        if (isSuggestedDate(date)) nextSuggested.add(date);
      }
    });

    setHours(nextHours);
    setSuggestedDates(nextSuggested);
  }, [dates, entryHours, suggestions, isSuggestedDate]);

  const saveDate = useCallback(
    async (date: string) => {
      const value = hoursRef.current[date] ?? 0;
      reportStatus({ status: 'saving' });

      try {
        await persist(date, value);
        setPendingSaves((prev) => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
        const remaining = new Set(pendingSavesRef.current);
        remaining.delete(date);
        if (remaining.size === 0) {
          reportStatus({ status: 'saved', lastSavedAt: new Date() });
        }
      } catch (error) {
        console.error('Error saving timesheet:', error);
        reportStatus({ status: 'error' });
        retryTimerRef.current = setTimeout(() => saveDate(date), RETRY_MS);
      }
    },
    [persist, reportStatus]
  );

  const scheduleSave = useCallback(
    (date: string) => {
      const existing = debounceTimersRef.current.get(date);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(date);
        saveDate(date);
      }, DEBOUNCE_MS);
      debounceTimersRef.current.set(date, timer);
    },
    [saveDate]
  );

  const handleHoursChange = useCallback(
    (date: string, value: string) => {
      if (onOfflineBlocked && !isOnline) {
        onOfflineBlocked();
        return;
      }
      const raw = value === '' ? 0 : parseFloat(value);
      if (isNaN(raw) || raw < 0) return;
      let numValue = Math.round(raw * 10) / 10;

      if (numValue > maxHours) {
        numValue = maxHours;
        onExceedMax?.(maxHours);
      }

      setHours((prev) => ({ ...prev, [date]: numValue }));
      editedValuesRef.current.set(date, numValue); // protege contra flick no refetch
      setPendingSaves((prev) => new Set(prev).add(date));
      // Ao editar, a célula deixa de ser sugestão e passa a ser lançamento real.
      setSuggestedDates((prev) => {
        if (!prev.has(date)) return prev;
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
      reportStatus({ status: 'unsaved' });
      scheduleSave(date);
    },
    [isOnline, maxHours, onExceedMax, onOfflineBlocked, reportStatus, scheduleSave]
  );

  const handleBlur = useCallback((date: string) => {
    const existing = debounceTimersRef.current.get(date);
    if (existing) {
      clearTimeout(existing);
      debounceTimersRef.current.delete(date);
    }
    if (!pendingSavesRef.current.has(date)) return;
    saveDate(date);
  }, [saveDate]);

  const totalHours = Object.values(hours).reduce((sum, h) => sum + (h || 0), 0);

  useEffect(() => { onLocalTotalChange?.(id, totalHours); }, [totalHours, id, onLocalTotalChange]);
  useEffect(() => { onLocalDayHoursChange?.(id, hours); }, [hours, id, onLocalDayHoursChange]);

  // Valores reais (entry salvo OU edição do usuário) — exclui sugestões.
  useEffect(() => {
    if (!onRealValuesChange) return;
    const real: Record<string, number> = {};
    dates.forEach((date) => {
      if (pendingSavesRef.current.has(date) || editedValuesRef.current.has(date) || entryHours[date] !== undefined) {
        real[date] = hours[date] ?? 0;
      }
    });
    onRealValuesChange(id, real);
  }, [hours, dates, entryHours, id, onRealValuesChange]);

  const isSuggested = useCallback((date: string) => suggestedDates.has(date), [suggestedDates]);

  const isReal = useCallback(
    (date: string) =>
      pendingSaves.has(date) || editedValuesRef.current.has(date) || entryHours[date] !== undefined,
    [pendingSaves, entryHours]
  );

  return {
    hours,
    pendingSaves,
    suggestedDates,
    saveStatus,
    totalHours,
    handleHoursChange,
    handleBlur,
    isSuggested,
    isReal,
  };
}
