import { useRef, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Trash2, Eye, Paperclip } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService } from '@/services/terminationService';
import { TerminationWithEmployee } from '@/services/terminationService';
import { TerminationDocumentType } from '@/types/termination';
import { DOCUMENT_CHECKLISTS, DocItem } from '@/components/employees/termination-wizard/TerminationStep4Documents';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  termination: TerminationWithEmployee;
}

export const TerminationDetailDocumentsTab = ({ termination }: Props) => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeChecklistKey, setActiveChecklistKey] = useState<string | null>(null);

  const contractType = termination.employees?.tipo_contratacao || 'CLT';
  const checklist = useMemo(() => {
    return DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
  }, [contractType]);

  const { data: documents = [] } = useQuery({
    queryKey: ['termination-documents', termination.id],
    queryFn: () => terminationService.getDocuments(termination.id),
  });

  const getDocForKey = (docKey: string) =>
    documents.find(d => d.document_type === docKey);

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: TerminationDocumentType }) =>
      terminationService.addDocument(termination.id, file, type, employee?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termination-documents', termination.id] });
      toast({ title: 'Documento enviado' });
    },
    onError: (e: Error) => toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => terminationService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termination-documents', termination.id] });
      toast({ title: 'Documento removido' });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || !activeChecklistKey) return;
    const type = activeChecklistKey as TerminationDocumentType;
    Array.from(files).forEach((f) => uploadMutation.mutate({ file: f, type }));
    setActiveChecklistKey(null);
  };

  const handleChecklistAttach = (key: string) => {
    setActiveChecklistKey(key);
    fileRef.current?.click();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Checklist de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.map(doc => {
            const uploaded = getDocForKey(doc.key);
            return (
              <div key={doc.key} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                <Checkbox
                  id={`checklist-${doc.key}`}
                  checked={!!uploaded}
                  disabled
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`checklist-${doc.key}`}
                    className={`text-sm cursor-default block ${uploaded ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {doc.label}
                  </Label>
                  {uploaded && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {uploaded.document_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {formatSize(uploaded.file_size)}
                      </span>
                    </div>
                  )}
                </div>
                <Badge
                  variant={doc.required ? 'destructive' : 'default'}
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${!doc.required ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}`}
                >
                  {doc.required ? 'Obrigatório' : 'Opcional'}
                </Badge>
                {uploaded ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={uploaded.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteMutation.mutate(uploaded.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleChecklistAttach(doc.key)}
                    disabled={uploadMutation.isPending}
                  >
                    <Paperclip className="h-3 w-3 mr-1" />
                    Anexar
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};
