import { useRef, useState } from 'react';
import { BookOpen, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectWithRelations } from '@/types/project';
import { useUploadValueBook } from '@/hooks/useProjects';

interface ProjectValueBookSectionProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function ProjectValueBookSection({ project, isReadOnly }: ProjectValueBookSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadValueBook();

  const handleFile = (file: File) => {
    upload.mutate({ file, projectId: project.id });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-foreground">Value Book</span>

      {project.value_book_url ? (
        <div className="flex items-center gap-2 ml-1">
          <a
            href={project.value_book_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visualizar documento
          </a>
          {!isReadOnly && (
            <span className="text-muted-foreground text-xs">·</span>
          )}
        </div>
      ) : (
        !isReadOnly && (
          <span className="text-sm text-muted-foreground ml-1">Nenhum documento enviado</span>
        )
      )}

      {!isReadOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={handleChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0"
            disabled={upload.isPending}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            {project.value_book_url ? 'Substituir' : 'Enviar documento'}
          </Button>
        </>
      )}
    </div>
  );
}
