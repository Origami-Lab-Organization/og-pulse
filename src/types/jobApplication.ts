export type JobApplicationStatus =
  | "triagem"
  | "entrevista"
  | "prova_tecnica"
  | "aprovado"
  | "descartado"
  | "banco_de_talentos";

export interface JobApplicationDB {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  telefone: string;
  linkedin: string | null;
  motivacao: string;
  curriculo_url: string | null;
  curriculo_nome: string | null;
  status: JobApplicationStatus;
  justificativa_movimentacao: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  vaga_id: string | null;
  vaga_titulo: string | null;
  created_at: string;
}

export interface CreateJobApplicationInput {
  nome: string;
  email: string;
  telefone: string;
  linkedin?: string;
  motivacao: string;
  curriculo?: File;
  vaga_id?: string;
  vaga_titulo?: string;
  responsavel_id?: string | null;
}

export const JOB_APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  triagem: "Triagem",
  entrevista: "Entrevista",
  prova_tecnica: "Prova Técnica",
  aprovado: "Aprovado",
  descartado: "Descartado",
  banco_de_talentos: "Banco de Talentos",
};

export const ACTIVE_STATUSES: JobApplicationStatus[] = [
  "triagem",
  "entrevista",
  "prova_tecnica",
  "aprovado",
];
