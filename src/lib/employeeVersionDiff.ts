import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmployeeVersionDB } from "@/services/employeeVersionService";
import { CONTRACT_TYPE_LABELS, SYSTEM_ROLE_LABELS, type ContractType, type SystemRole } from "@/types/employee";
import { formatCurrency } from "@/lib/formatters";

function formatDateField(value: string | null): string {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

/** Campos "diretos" (não bancários/PIX) comparados entre uma versão e a anterior. */
const DIFF_FIELDS: {
  key: keyof EmployeeVersionDB;
  label: string;
  format?: (value: unknown) => string;
}[] = [
  { key: "cargo", label: "Cargo" },
  {
    key: "tipo_contratacao",
    label: "Tipo de contratação",
    format: (v) => CONTRACT_TYPE_LABELS[v as ContractType] ?? String(v),
  },
  { key: "salario_mensal", label: "Salário bruto", format: (v) => formatCurrency(Number(v)) },
  { key: "valor_contrato_pj", label: "Valor do contrato PJ", format: (v) => formatCurrency(Number(v)) },
  { key: "dividendos", label: "Dividendos", format: (v) => formatCurrency(Number(v)) },
  { key: "jornada_diaria", label: "Jornada diária", format: (v) => `${v}h/dia` },
  { key: "nome", label: "Nome" },
  { key: "telefone", label: "Telefone" },
  { key: "cpf", label: "CPF" },
  { key: "data_nascimento", label: "Data de nascimento", format: (v) => formatDateField(v as string | null) },
  { key: "data_admissao", label: "Data de admissão", format: (v) => formatDateField(v as string | null) },
  {
    key: "system_role",
    label: "Permissão",
    format: (v) => (v ? (SYSTEM_ROLE_LABELS[v as SystemRole] ?? String(v)) : "—"),
  },
  { key: "is_gerente", label: "Gerente", format: (v) => (v ? "Sim" : "Não") },
];

const BANK_PIX_FIELDS: (keyof EmployeeVersionDB)[] = [
  "pix_key_type",
  "pix_key",
  "bank_name",
  "bank_account_type",
  "bank_agency",
  "bank_account",
];

/** O que mudou entre `version` e a versão cronologicamente anterior — [] para a mais antiga. */
export function describeChanges(version: EmployeeVersionDB, previous: EmployeeVersionDB | undefined): string[] {
  if (!previous) return [];
  const changes: string[] = [];

  for (const field of DIFF_FIELDS) {
    const before = previous[field.key];
    const after = version[field.key];
    if (before === after || before == null || after == null) continue;
    const fmt = field.format ?? ((v: unknown) => String(v));
    changes.push(`${field.label}: ${fmt(before)} → ${fmt(after)}`);
  }

  // Dados bancários/PIX agrupados num único badge (em vez de expor os valores lado a lado).
  const bankChanged = BANK_PIX_FIELDS.some((key) => previous[key] !== version[key]);
  if (bankChanged) changes.push("Dados bancários/PIX atualizados");

  return changes;
}
