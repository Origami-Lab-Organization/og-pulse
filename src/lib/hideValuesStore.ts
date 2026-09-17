/**
 * O estado de "ocultar valores", fora do React.
 *
 * Mora aqui, e não em `@/contexts/HideValuesContext`, para quebrar o ciclo: `formatters`
 * precisa LER o estado, o contexto precisa de `formatters` para as máscaras, e um importar o
 * outro fecharia o laço. Este módulo não importa nada.
 *
 * A preferência é do DISPOSITIVO (localStorage), não da conta: ocultar valor é sobre quem
 * está olhando a sua tela agora — reunião, café, telão. O celular não herda a decisão tomada
 * no notebook, e por isso não vai para o banco.
 */

export const HIDE_VALUES_STORAGE_KEY = 'og-pulse:hideValues';

let hidden = readInitial();
const listeners = new Set<() => void>();

function readInitial(): boolean {
  // Aba anônima, dados de site bloqueados ou pré-render: ler pode estourar, e falhar aqui não
  // pode derrubar a tela. O padrão é MOSTRAR, que é o comportamento de sempre.
  try {
    return localStorage.getItem(HIDE_VALUES_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function valuesAreHidden(): boolean {
  return hidden;
}

export function setValuesHidden(next: boolean): void {
  if (hidden === next) return;
  hidden = next;
  try {
    localStorage.setItem(HIDE_VALUES_STORAGE_KEY, String(next));
  } catch {
    // Sem persistência a preferência vale só nesta sessão — melhor do que não funcionar.
  }
  listeners.forEach((l) => l());
}

export function subscribeValuesHidden(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
