import type { ProjectFileCategory } from '@/types/projectFile.types';

/**
 * Categoria gravada hoje. `contract` existe no tipo apenas para ler linhas
 * históricas anteriores a 20260811190000 — o fluxo atual não cria nenhuma.
 */
export const PROJECT_FILE_CATEGORY_DOCUMENT: ProjectFileCategory = 'document';
