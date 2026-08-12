/** Device code emitido, aguardando a pessoa concluir no navegador. */
export interface DeviceCodeSession {
  /** Texto pronto para exibir, já com URL e código. */
  instructions: string;
  userCode: string;
  verificationUri: string;
}

/** Tokens da Microsoft persistidos em disco (0600). */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch em ms. */
  expiresAt: number;
  /** E-mail de quem autorizou, só para exibição. */
  account: string | null;
}

/** Projeto do Pulse com pasta raiz vinculada no OneDrive. */
export interface ProjectDriveTarget {
  id: string;
  name: string;
  clientName: string | null;
  driveId: string;
  rootItemId: string;
  rootPath: string | null;
}

/** Item dentro da pasta do projeto. */
export interface DriveChild {
  id: string;
  name: string;
  isFolder: boolean;
  size: number;
  lastModifiedAt: string | null;
}

/** Conteúdo pronto para subir, vindo do disco ou de uma URL. */
export interface LoadedSource {
  content: Uint8Array;
  fileName: string;
  contentType: string;
}
