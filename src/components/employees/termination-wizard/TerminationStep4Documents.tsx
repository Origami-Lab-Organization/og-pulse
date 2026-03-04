import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, Info } from 'lucide-react';
import { TerminationWizardData } from './types';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
}

const DOCUMENT_CHECKLIST = [
  { key: 'termination_letter', label: 'Termo de desligamento' },
  { key: 'trct', label: 'TRCT - Termo de Rescisão' },
  { key: 'homologation', label: 'Comprovante de homologação' },
  { key: 'medical_exam', label: 'Exame demissional' },
  { key: 'resignation_letter', label: 'Carta de demissão (se pedido de demissão)' },
];

const TerminationStep4Documents = ({ data, onChange }: Props) => {
  const toggleChecklist = (key: string) => {
    onChange({
      document_checklist: {
        ...data.document_checklist,
        [key]: !data.document_checklist[key],
      },
    });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      return allowed.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    onChange({ uploaded_files: [...data.uploaded_files, ...valid] });
    e.target.value = '';
  }, [data.uploaded_files, onChange]);

  const removeFile = (index: number) => {
    onChange({ uploaded_files: data.uploaded_files.filter((_, i) => i !== index) });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter(f => {
      const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      return allowed.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    onChange({ uploaded_files: [...data.uploaded_files, ...valid] });
  }, [data.uploaded_files, onChange]);

  return (
    <div className="space-y-4">
      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Checklist de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DOCUMENT_CHECKLIST.map(doc => (
            <div key={doc.key} className="flex items-center gap-3">
              <Checkbox
                id={doc.key}
                checked={!!data.document_checklist[doc.key]}
                onCheckedChange={() => toggleChecklist(doc.key)}
              />
              <Label htmlFor={doc.key} className="text-sm cursor-pointer">{doc.label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upload de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Arraste arquivos aqui ou</p>
            <label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">Selecionar Arquivos</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX, JPG, PNG — máx. 10MB</p>
          </div>

          {data.uploaded_files.length > 0 && (
            <div className="space-y-2">
              {data.uploaded_files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Documentos podem ser anexados posteriormente na área de Funcionários Desligados.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TerminationStep4Documents;
