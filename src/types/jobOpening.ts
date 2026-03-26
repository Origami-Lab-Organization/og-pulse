export type JobOpeningStatus = "aberta" | "rascunho" | "encerrada";
export type RegimeContratacao = "clt" | "pj" | "estagio" | "clt-pj";
export type Modalidade = "presencial" | "hibrido" | "remoto";

export interface JobOpeningDB {
  id: string;
  tenant_id: string;
  titulo: string;
  area: string;
  regime_contratacao: RegimeContratacao;
  modalidade: Modalidade;
  localizacao: string | null;
  salario_de: number | null;
  salario_ate: number | null;
  nao_divulgar_salario: boolean;
  beneficios: string | null;
  sobre_a_vaga: string;
  senioridade: string | null;
  responsabilidades: string;
  requisitos_obrigatorios: string;
  diferenciais: string | null;
  sobre_empresa: string;
  status: JobOpeningStatus;
  prazo_candidaturas: string | null;
  public_url: string | null;
  responsavel_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobOpeningInput {
  titulo: string;
  area: string;
  regime_contratacao: RegimeContratacao;
  modalidade: Modalidade;
  localizacao?: string | null;
  salario_de?: number | null;
  salario_ate?: number | null;
  nao_divulgar_salario: boolean;
  beneficios?: string | null;
  sobre_a_vaga: string;
  senioridade?: string | null;
  responsabilidades: string;
  requisitos_obrigatorios: string;
  diferenciais?: string | null;
  sobre_empresa: string;
  status: JobOpeningStatus;
  prazo_candidaturas?: string | null;
  public_url?: string | null;
  responsavel_id?: string | null;
  created_by?: string | null;
}

export type UpdateJobOpeningInput = Partial<CreateJobOpeningInput>;

export const JOB_OPENING_STATUS_LABELS: Record<JobOpeningStatus, string> = {
  aberta: "Aberta",
  rascunho: "Rascunho",
  encerrada: "Encerrada"
};

export const REGIME_LABELS: Record<RegimeContratacao, string> = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  "clt-pj": "CLT ou PJ"
};

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto"
};

export const JOB_AREAS = [
  "Tecnologia",
  "Design",
  "Marketing",
  "Comercial",
  "Financeiro",
  "RH",
  "Operações",
  "Gestão",
  "Produto",
  "Jurídico",
  "Outros"
] as const;

export const SENIORIDADE_OPTIONS = [
  "Estagiário",
  "Júnior",
  "Pleno",
  "Sênior",
  "Especialista",
  "Liderança"
] as const;

export const ABOUT_ORIGAMI_LAB_DEFAULT =
  "A Origami Lab é uma consultoria de inovação e gestão focada em transformar desafios complexos em soluções estratégicas. Com uma equipe multidisciplinar e apaixonada por resultados, trabalhamos lado a lado com nossos clientes para criar impacto real nos negócios. Acreditamos que boas ideias, executadas com excelência, podem mudar o rumo das organizações.";
