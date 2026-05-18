import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { formatCurrency, formatPercent } from '@/lib/formatters';

const STORAGE_KEY = 'og-pulse:hideValues';

export function useHideValuesPreference(): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setAndPersist = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(STORAGE_KEY, String(resolved));
      } catch {
        // ignore quota / privacy errors
      }
      return resolved;
    });
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setValue(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return [value, setAndPersist];
}

const HideValuesContext = createContext<boolean>(false);

export function HideValuesProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <HideValuesContext.Provider value={value}>{children}</HideValuesContext.Provider>
  );
}

export function useHideValues(): boolean {
  return useContext(HideValuesContext);
}

export function useMaskedCurrency() {
  const hide = useHideValues();
  return (value: number | null | undefined) =>
    hide ? '•••••' : formatCurrency(Number(value) || 0);
}

export function useMaskedPercent() {
  const hide = useHideValues();
  return (value: number | null | undefined, decimals = 0) =>
    hide ? '•••' : formatPercent(Number(value) || 0, decimals);
}
