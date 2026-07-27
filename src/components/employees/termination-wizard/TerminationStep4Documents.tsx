import { useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Trash2, Info } from 'lucide-react';
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

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const MAX_SIZE = 10 * 1024 * 1024;

const TerminationStep4Documents = ({ data, onChange, contractType }: Props) => {
  const checklist = useMemo(() => {
    return DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
  }, [contractType]);

  const setFileForDoc = useCallback((key: string, file: File | null) => {
    onChange({ document_files: { ...data.document_files, [key]: file } });
  }, [data.document_files, onChange]);

  const handleFileSelect = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) return;
    setFileForDoc(key, file);
  }, [setFileForDoc]);

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{contractType === 'PJ' ? 'Documentos da Rescisão' : 'Checklist de Documentos'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map(doc => {
            const file = data.document_files[doc.key];
            return (
              <div key={doc.key} className="flex items-center gap-3">
                <Label className="text-sm flex-1 min-w-0 truncate">{doc.label}</Label>
                <Badge
                  variant={doc.required ? 'destructive' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 shrink-0"
                >
                  {doc.required ? 'Obrigatório' : 'Opcional'}
                </Badge>
                {file ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground max-w-[120px] truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      asChild
                    >
                      <a href={URL.createObjectURL(file)} download={file.name} title="Baixar">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setFileForDoc(doc.key, null)}
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <label className="shrink-0">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => handleFileSelect(doc.key, e)}
                      className="hidden"
                    />
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                      <span className="cursor-pointer" title="Anexar arquivo">
                        <Upload className="h-3.5 w-3.5" />
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export { DOCUMENT_CHECKLISTS };
export type { DocItem };
export default TerminationStep4Documents;
