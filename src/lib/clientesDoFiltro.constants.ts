import type { ProjectStatus } from '@/types/project';

/** US-0048: o filtro de clientes mostra só quem tem projeto em andamento ou encerrado há pouco. */
export const STATUS_EM_ANDAMENTO: readonly ProjectStatus[] = ['planning', 'active', 'paused'];
export const STATUS_CONCLUIDO: ProjectStatus = 'completed';
export const MESES_DE_ENCERRAMENTO_RECENTE = 12;
