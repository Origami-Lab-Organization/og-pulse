import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kanban, List, Search, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useJobApplications,
  useUpdateJobApplicationStatus
} from "@/hooks/useJobApplications";
import { CandidateKanbanBoard } from "@/components/candidates/CandidateKanbanBoard";
import { CandidateDetailDialog } from "@/components/candidates/CandidateDetailDialog";
import { CandidateFormSheet } from "@/components/candidates/CandidateFormSheet";
import {
  JobApplicationDB,
  JOB_APPLICATION_STATUS_LABELS,
  JobApplicationStatus,
  ACTIVE_STATUSES,
  VAGA_PRETENDIDA_LABELS
} from "@/types/jobApplication";
import { formatDate } from "@/lib/formatters";

type ActiveTab = "ativos" | "descartados" | "banco_de_talentos";

const STATUS_BADGE: Record<JobApplicationStatus, string> = {
  triagem: "bg-blue-100 text-blue-700 border-blue-200",
  entrevista: "bg-yellow-100 text-yellow-700 border-yellow-200",
  prova_tecnica: "bg-orange-100 text-orange-700 border-orange-200",
  aprovado: "bg-green-100 text-green-700 border-green-200",
  descartado: "bg-red-100 text-red-700 border-red-200",
  banco_de_talentos: "bg-purple-100 text-purple-700 border-purple-200"
};

const Candidates = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ativos");
  const [displayMode, setDisplayMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { employee } = useAuth();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/trabalhe-conosco/${employee?.tenant_id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const { data: candidates = [], isLoading } = useJobApplications();
  const updateStatus = useUpdateJobApplicationStatus();

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const ativos = useMemo(
    () => candidates.filter((c) => ACTIVE_STATUSES.includes(c.status)),
    [candidates]
  );

  const descartados = useMemo(
    () => candidates.filter((c) => c.status === "descartado"),
    [candidates]
  );

  const bancoDeTalentos = useMemo(
    () => candidates.filter((c) => c.status === "banco_de_talentos"),
    [candidates]
  );

  const currentList = useMemo(() => {
    const base =
      activeTab === "ativos"
        ? ativos
        : activeTab === "descartados"
          ? descartados
          : bancoDeTalentos;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [activeTab, ativos, descartados, bancoDeTalentos, search]);

  const handleStatusChange = (id: string, status: JobApplicationStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleRowClick = (candidate: JobApplicationDB) => {
    setSelectedCandidateId(candidate.id);
    setDetailOpen(true);
  };

  const renderTable = (rows: JobApplicationDB[], showJustificativa = false) => (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Nome
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              E-mail
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Telefone
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Vaga pretendida
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Status
            </th>
            {showJustificativa && (
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Justificativa
              </th>
            )}
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Candidatado em
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={showJustificativa ? 7 : 6}
                className="text-center py-10 text-muted-foreground"
              >
                Nenhum candidato encontrado.
              </td>
            </tr>
          ) : (
            rows.map((candidate) => (
              <tr
                key={candidate.id}
                onClick={() => handleRowClick(candidate)}
                className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {candidate.nome}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {candidate.email}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {candidate.telefone}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {candidate.vaga_pretendida
                    ? VAGA_PRETENDIDA_LABELS[candidate.vaga_pretendida]
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      STATUS_BADGE[candidate.status]
                    )}
                  >
                    {JOB_APPLICATION_STATUS_LABELS[candidate.status]}
                  </span>
                </td>
                {showJustificativa && (
                  <td className="px-4 py-3 text-muted-foreground max-w-[260px]">
                    <span className="block truncate">
                      {candidate.justificativa_movimentacao || "—"}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(candidate.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppLayout
      title="Contratações"
      description="Gerencie as candidaturas recebidas pelo formulário público."
      actions={
        <>
          <Button onClick={handleCopyLink} size="sm" variant="outline">
            {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {linkCopied ? "Link copiado!" : "Copiar link do formulário"}
          </Button>
          <Button onClick={() => setFormOpen(true)} size="sm">
            <UserPlus className="h-4 w-4" />
            Adicionar candidato
          </Button>
        </>
      }
    >
      {/* Barra de controles */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar candidato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        {/* Tab navigator */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 shrink-0">
          {(
            [
              { key: "ativos", label: "Ativos", count: ativos.length },
              {
                key: "descartados",
                label: "Descartados",
                count: descartados.length
              },
              {
                key: "banco_de_talentos",
                label: "Banco de Talentos",
                count: bancoDeTalentos.length
              }
            ] as { key: ActiveTab; label: string; count: number }[]
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-xs rounded-full px-1.5 min-w-[20px] text-center leading-none py-0.5",
                  activeTab === key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle kanban/lista (só na aba Ativos) */}
        {activeTab === "ativos" && (
          <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setDisplayMode("kanban")}
              className={cn(
                "p-2 transition-colors",
                displayMode === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
              title="Kanban"
            >
              <Kanban className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDisplayMode("list")}
              className={cn(
                "p-2 transition-colors",
                displayMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "ativos" && displayMode === "kanban" ? (
        <CandidateKanbanBoard
          candidates={currentList}
          onStatusChange={handleStatusChange}
        />
      ) : activeTab === "ativos" ? (
        renderTable(currentList)
      ) : (
        renderTable(currentList, true)
      )}

      <CandidateDetailDialog
        candidate={selectedCandidate}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={handleStatusChange}
      />

      <CandidateFormSheet open={formOpen} onOpenChange={setFormOpen} />
    </AppLayout>
  );
};

export default Candidates;
