/** Situação do push neste navegador para o funcionário logado. */
export type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'unconfigured'
  | 'denied'
  | 'enabled'
  | 'disabled';
