import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  JobApplicationDB,
  JobApplicationStatus,
  JOB_APPLICATION_STATUS_LABELS
} from "@/types/jobApplication";
import { CandidateKanbanColumn } from "./CandidateKanbanColumn";
import { CandidateKanbanCard } from "./CandidateKanbanCard";
import { CandidateDetailDialog } from "./CandidateDetailDialog";

interface CandidateKanbanBoardProps {
  candidates: JobApplicationDB[];
  onStatusChange: (id: string, status: JobApplicationStatus) => void;
}

const COLUMNS: { id: JobApplicationStatus; color: string }[] = [
  { id: "triagem", color: "bg-blue-400" },
  { id: "entrevista", color: "bg-yellow-400" },
  { id: "prova_tecnica", color: "bg-orange-400" },
  { id: "aprovado", color: "bg-green-500" },
];

export function CandidateKanbanBoard({
  candidates,
  onStatusChange
}: CandidateKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const draggingCandidate = draggingId
    ? (candidates.find((c) => c.id === draggingId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const candidateId = String(active.id);
    const newStatus = String(over.id) as JobApplicationStatus;
    const candidate = candidates.find((c) => c.id === candidateId);

    if (candidate && candidate.status !== newStatus) {
      onStatusChange(candidateId, newStatus);
    }
  };

  const handleCardClick = (candidate: JobApplicationDB) => {
    setSelectedCandidateId(candidate.id);
    setDetailOpen(true);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-[repeat(4,minmax(220px,1fr))] gap-4 h-[calc(100vh-220px)]">
          {COLUMNS.map(({ id, color }) => (
            <CandidateKanbanColumn
              key={id}
              id={id}
              title={JOB_APPLICATION_STATUS_LABELS[id]}
              color={color}
              candidates={candidates.filter((c) => c.status === id)}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
        </div>

        <DragOverlay>
          {draggingCandidate && (
            <CandidateKanbanCard
              candidate={draggingCandidate}
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <CandidateDetailDialog
        candidate={selectedCandidate}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
