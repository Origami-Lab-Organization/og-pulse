import { useRef, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, File, Trash2, Download, Eye, CheckCircle2, Paperclip } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService } from '@/services/terminationService';
import { TerminationWithEmployee } from '@/services/terminationService';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, TerminationDocumentType } from '@/types/termination';
import { DOCUMENT_CHECKLISTS, DocItem } from '@/components/employees/termination-wizard/TerminationStep4Documents';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  termination: TerminationWithEmployee;
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return <File className="h-8 w-8 text-muted-foreground" />;
  if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

export const TerminationDetailDocumentsTab = ({ termination }: Props) => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<TerminationDocumentType>('other');
  const [activeChecklistKey, setActiveChecklistKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const contractType = termination.employees?.tipo_contratacao || 'CLT';
  const checklist = useMemo(() => {
    return DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
  }, [contractType]);

  const { data: documents = [], isLoading } = useQuery({
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
    if (!files) return;
    const type = activeChecklistKey
      ? (activeChecklistKey as TerminationDocumentType)
      : docType;
    Array.from(files).forEach((f) => uploadMutation.mutate({ file: f, type }));
    setActiveChecklistKey(null);
  };

  const handleChecklistAttach = (key: string) => {
    setActiveChecklistKey(key);
    fileRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Documents not associated with any checklist key (extras)
  const checklistKeys = new Set(checklist.map(c => c.key));
  const extraDocuments = documents.filter(d => !checklistKeys.has(d.document_type));

  return (
    <div className="space-y-4">
      {/* Checklist de Documentos */}
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
                  variant={doc.required ? 'destructive' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 shrink-0"
                >
                  {doc.required ? 'Obrigatório' : 'Opcional'}
                </Badge>
                {uploaded ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
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

      {/* Upload area for extra docs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Enviar Documento Avulso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => { setActiveChecklistKey(null); fileRef.current?.click(); }}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Arraste arquivos aqui ou <span className="text-primary font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG — até 10MB</p>
          </div>
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

      {/* Extra documents (not in checklist) */}
      {extraDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outros Documentos ({extraDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {extraDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                  {getFileIcon(doc.mime_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.document_type as TerminationDocumentType]} • {formatSize(doc.file_size)} • {format(new Date(doc.uploaded_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={doc.file_url} download><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(doc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
