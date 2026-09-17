/**
 * Ocultar valores monetários na tela (o "olho" do cabeçalho).
 *
 * POR QUE UM STORE DE MÓDULO, E NÃO SÓ UM CONTEXTO. `formatCurrency` é chamada ~600 vezes em
 * 117 arquivos, sempre como função pura dentro do JSX. Um contexto só re-renderiza quem o
 * consome, então cobrir tudo por contexto exigiria trocar os 600 usos. O formatador consulta
 * este store e a cobertura é imediata; quem faz a tela reagir ao clique é o `key` do
 * `AppLayout` (ver `ValueVisibilityToggle`).
 *
 * O QUE NÃO PASSA POR AQUI: `formatCurrency` de `@/lib/masks`, que é máscara de campo de
 * edição. Ocultar o valor enquanto alguém digita um salário seria defeito, não privacidade.
 *
 * A preferência é do DISPOSITIVO (localStorage), não da conta: ocultar valor é sobre quem está
 * olhando a sua tela agora — reunião, café, telão. O celular não herda a decisão tomada no
 * notebook. Por isso não vai para o banco, ao contrário da preferência do guia (PUL-250).
 */

const STORAGE_KEY = 'pulse:hide-values';

/** O que aparece no lugar do valor. Mantém o `R$` para a coluna não perder o sentido. */
export const HIDDEN_VALUE_MASK = 'R$ ••••';

let hidden = readInitial();
const listeners = new Set<() => void>();

function readInitial(): boolean {
  // Em aba anônima, com dados de site bloqueados ou durante pré-render, ler pode estourar.
  // Falhar aqui não pode derrubar a tela: o padrão é mostrar, que é o comportamento de hoje.
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function areValuesHidden(): boolean {
  return hidden;
}

export function setValuesHidden(next: boolean): void {
  if (hidden === next) return;
  hidden = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Sem persistência a preferência vale só nesta sessão — melhor do que não funcionar.
  }
  listeners.forEach((l) => l());
}

export function subscribeValueVisibility(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
