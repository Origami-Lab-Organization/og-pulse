/**
 * Ritos de projeto vinculados a compromissos do calendário.
 * Decisões: .harness/adr/0011-project-ritos-calendar-link.md
 */

/** Lista fechada: o relatório compara projetos entre si. `outro` é escape. */
export const PROJECT_RITO_TYPE = {
  DAILY: 'daily',
  PLANNING: 'planning',
  REVIEW: 'review',
  RETRO: 'retro',
  OUTRO: 'outro',
} as const;

export type ProjectRitoType =
  (typeof PROJECT_RITO_TYPE)[keyof typeof PROJECT_RITO_TYPE];

export const PROJECT_RITO_LABEL: Record<ProjectRitoType, string> = {
  [PROJECT_RITO_TYPE.DAILY]: 'Daily',
  [PROJECT_RITO_TYPE.PLANNING]: 'Planning',
  [PROJECT_RITO_TYPE.REVIEW]: 'Review',
  [PROJECT_RITO_TYPE.RETRO]: 'Retro',
  [PROJECT_RITO_TYPE.OUTRO]: 'Outro',
};

/** Vínculo já existente, como a tela lê. */
export interface ProjectRitoLink {
  id: string;
  projectId: string;
  projectName: string;
  ritoType: ProjectRitoType;
  eventTitle: string;
  linkedByName: string | null;
}

/** Projeto elegível para receber vínculo (membro ou gerente). */
export interface RitoProjectOption {
  id: string;
  name: string;
}

export interface CreateProjectRitoInput {
  projectId: string;
  ritoType: ProjectRitoType;
  icalUid: string;
  eventTitle: string;
  isSeries: boolean;
}
