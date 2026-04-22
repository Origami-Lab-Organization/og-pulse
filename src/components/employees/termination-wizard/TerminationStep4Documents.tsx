import { useCallback, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Info, AlertTriangle } from 'lucide-react';
import { TerminationWizardData } from './types';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
  contractType: string;
}

interface DocItem {
  key: string;
  label: string;
  required: boolean;
}

const DOCUMENT_CHECKLISTS: Record<string, DocItem[]> = {
  CLT: [
    { key: 'termination_letter', label: 'Termo de Rescisão', required: true },
    { key: 'trct', label: 'TRCT - Termo de Rescisão do Contrato de Trabalho', required: true },
    { key: 'medical_exam', label: 'Exame demissional', required: true },
    { key: 'homologation', label: 'Comprovante de homologação', required: false },
    { key: 'resignation_letter', label: 'Carta de demissão (se pedido de demissão)', required: false },
  ],
  ESTAGIO: [
    { key: 'termination_letter', label: 'Termo de Encerramento de Estágio', required: true },
    { key: 'final_report', label: 'Relatório Final de Estágio', required: true },
    { key: 'performance_eval', label: 'Avaliação de Desempenho', required: false },
  ],
  PJ: [
    { key: 'contract_termination', label: 'Distrato / Rescisão Contratual', required: true },
    { key: 'quitacao', label: 'Termo de Quitação', required: false },
  ],
  SOCIO: [
    { key: 'contract_amendment', label: 'Alteração Contratual', required: true },
    { key: 'meeting_minutes', label: 'Ata de Reunião de Sócios', required: true },
    { key: 'quota_transfer', label: 'Termo de Cessão de Quotas', required: false },
  ],
  MENOR_APRENDIZ: [
    { key: 'termination_letter', label: 'Termo de Rescisão', required: true },
    { key: 'trct', label: 'TRCT - Termo de Rescisão do Contrato de Trabalho', required: true },
    { key: 'medical_exam', label: 'Exame demissional', required: true },
    { key: 'activity_report', label: 'Relatório de Atividades', required: false },
  ],
};

const TerminationStep4Documents = ({ data, onChange, contractType }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const checklist = useMemo(() => {
    return DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
  }, [contractType]);

  const missingRequiredDocs = useMemo(() => {
    return checklist.filter(d => d.required && !data.document_checklist[d.key]);
  }, [checklist, data.document_checklist]);

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
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter(f => {
      const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      return allowed.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    onChange({ uploaded_files: [...data.uploaded_files, ...valid] });
  }, [data.uploaded_files, onChange]);

  return (
    <div className="space-y-4">
      {contractType === 'PJ' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Para contratos PJ, o distrato pode ser formalizado via e-mail ou documento simples. Não é necessário reconhecimento em cartório.
          </AlertDescription>
        </Alert>
      )}
      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{contractType === 'PJ' ? 'Documentos da Rescisão' : 'Checklist de Documentos'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map(doc => (
            <div key={doc.key} className="flex items-center gap-3">
              <Checkbox
                id={doc.key}
                checked={!!data.document_checklist[doc.key]}
                onCheckedChange={() => toggleChecklist(doc.key)}
              />
              <Label htmlFor={doc.key} className="text-sm cursor-pointer flex-1">{doc.label}</Label>
              <Badge
                variant={doc.required ? 'destructive' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                {doc.required ? 'Obrigatório' : 'Opcional'}
              </Badge>
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
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
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

      {missingRequiredDocs.length > 0 && (
        <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Documentos obrigatórios pendentes:</strong> {missingRequiredDocs.map(d => d.label).join(', ')}.
            O processo ficará com status <strong>"Aguardando Documentos"</strong> até que sejam anexados.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Documentos podem ser anexados posteriormente na área de Funcionários Desligados.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export { DOCUMENT_CHECKLISTS };
export type { DocItem };
export default TerminationStep4Documents;
