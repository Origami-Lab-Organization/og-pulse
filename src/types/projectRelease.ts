export type ReleaseStatus = 'planned' | 'in_progress' | 'released';

export interface ProjectReleaseDB {
  id: string;
  project_id: string;
  tenant_id: string;
  name: string;
  version: string | null;
  description: string | null;
  target_date: string;    // YYYY-MM-DD
  released_at: string | null; // YYYY-MM-DD
  status: ReleaseStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectReleaseWithSprints extends ProjectReleaseDB {
  release_sprints: { id: string; sprint_id: string }[];
}

export interface CreateReleaseInput {
  projectId: string;
  name: string;
  version?: string;
  description?: string;
  targetDate: string; // YYYY-MM-DD
}

export interface UpdateReleaseInput {
  name?: string;
  version?: string | null;
  description?: string | null;
  targetDate?: string;
  releasedAt?: string | null;
  status?: ReleaseStatus;
}

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  planned:     'Planejada',
  in_progress: 'Em andamento',
  released:    'Lançada',
};

export const RELEASE_STATUS_CLASSES: Record<ReleaseStatus, string> = {
  planned:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  released:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};
