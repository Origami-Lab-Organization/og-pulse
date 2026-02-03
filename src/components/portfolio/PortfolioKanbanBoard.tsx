import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { PortfolioColumn } from './PortfolioColumn';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioProject, useUpdatePortfolioStage } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_COLUMNS, PortfolioStage } from '@/types/portfolio';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface PortfolioKanbanBoardProps {
  projects: PortfolioProject[];
}

export function PortfolioKanbanBoard({ projects }: PortfolioKanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const updateStage = useUpdatePortfolioStage();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // Group projects by stage
  const projectsByStage = useMemo(() => {
    const grouped: Record<PortfolioStage, PortfolioProject[]> = {
      planning: [],
      value_delivery: [],
      results_presentation: [],
      value_book: [],
      learning_case: [],
      completed: [],
    };

    projects.forEach((project) => {
      const stage = (project.portfolio_stage as PortfolioStage) || 'planning';
      if (grouped[stage]) {
        grouped[stage].push(project);
      } else {
        grouped['planning'].push(project);
      }
    });

    return grouped;
  }, [projects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const project = projects.find((p) => p.id === active.id);
    if (project) {
      setActiveProject(project);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Determine the target stage
    let targetStage: PortfolioStage | null = null;

    // Check if dropped over a column
    if (PORTFOLIO_COLUMNS.some((col) => col.id === over.id)) {
      targetStage = over.id as PortfolioStage;
    } else {
      // Dropped over a card - find which column it belongs to
      const overProject = projects.find((p) => p.id === over.id);
      if (overProject) {
        targetStage = (overProject.portfolio_stage as PortfolioStage) || 'planning';
      }
    }

    if (targetStage && targetStage !== project.portfolio_stage) {
      updateStage.mutate({ projectId, newStage: targetStage });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full h-full">
        <div className="flex gap-4 p-4 pb-6">
          {PORTFOLIO_COLUMNS.map((column) => (
            <PortfolioColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              projects={projectsByStage[column.id]}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeProject ? (
          <div className="rotate-3 scale-105">
            <PortfolioCard project={activeProject} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
