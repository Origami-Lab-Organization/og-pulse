import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScanFace, Loader2, Camera, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFaceProfile, useEnrollFaceProfile, useDeleteFaceProfile } from '@/hooks/useFaceProfile';
import { computeFaceDescriptor, CONSENT_VERSION } from '@/lib/faceRecognition';
import { useToast } from '@/hooks/use-toast';

interface Props {
  employeeId: string;
}

export function FaceEnrollmentCard({ employeeId }: Props) {
  const { data: profile, isLoading } = useFaceProfile(employeeId);
  const enroll = useEnrollFaceProfile();
  const deleteProfile = useDeleteFaceProfile();
  const { toast } = useToast();

  const [consentChecked, setConsentChecked] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!captureOpen) return;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        toast({
          title: 'Não foi possível acessar a câmera',
          description: 'Verifique a permissão do navegador e tente novamente.',
          variant: 'destructive',
        });
        setCaptureOpen(false);
      });

    return () => stopCamera();
  }, [captureOpen, toast]);

  const handleCaptureAndEnroll = async () => {
    if (!videoRef.current) return;
    setDetecting(true);
    try {
      const descriptor = await computeFaceDescriptor(videoRef.current);
      if (!descriptor) {
        toast({
          title: 'Nenhum rosto detectado',
          description: 'Posicione seu rosto no centro da câmera e tente novamente.',
          variant: 'destructive',
        });
        return;
      }
      enroll.mutate(
        { descriptor, consentimentoVersao: CONSENT_VERSION },
        { onSuccess: () => setCaptureOpen(false) },
      );
    } catch (error) {
      toast({
        title: 'Erro ao processar o rosto',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanFace className="h-4 w-4" /> Reconhecimento facial
        </CardTitle>
        <CardDescription>
          Verificação opcional de identidade ao bater o ponto — nunca bloqueia o registro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ativo desde {format(new Date(profile.consentimento_aceito_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
              Sua identidade é comparada localmente no seu navegador — nenhuma foto ou dado biométrico é enviado a terceiros.
            </p>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover meus dados biométricos
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="mb-2">
                Ao cadastrar, coletamos uma representação numérica do seu rosto (não a foto em si) para
                comparar com as fotos tiradas ao bater o ponto. Isso é um dado biométrico sensível (LGPD).
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Uso: só para confirmar sua identidade no registro de ponto.</li>
                <li>Nunca sai do seu navegador — a comparação é feita localmente, não em serviço externo.</li>
                <li>Nunca bloqueia sua marcação, mesmo se o reconhecimento falhar.</li>
                <li>Você pode remover esse cadastro quando quiser, sem precisar de justificativa.</li>
              </ul>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="consent-face" checked={consentChecked} onCheckedChange={(c) => setConsentChecked(c === true)} />
              <label htmlFor="consent-face" className="text-sm leading-snug">
                Li e concordo com a coleta do meu dado biométrico facial para verificação de identidade no registro de ponto.
              </label>
            </div>
            <Button disabled={!consentChecked} onClick={() => setCaptureOpen(true)}>
              <Camera className="mr-2 h-4 w-4" />
              Cadastrar meu rosto
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={captureOpen} onOpenChange={(open) => { if (!open) stopCamera(); setCaptureOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar rosto</DialogTitle>
            <DialogDescription>Centralize seu rosto e capture.</DialogDescription>
          </DialogHeader>
          <video ref={videoRef} autoPlay muted playsInline className="aspect-square w-full rounded-md bg-muted object-cover" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptureOpen(false)} disabled={detecting || enroll.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCaptureAndEnroll} disabled={detecting || enroll.isPending}>
              {(detecting || enroll.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Capturar e cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dados biométricos?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu descriptor facial será excluído permanentemente. Você poderá cadastrar novamente quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProfile.isPending}
              onClick={() => deleteProfile.mutate(undefined, { onSuccess: () => setDeleteConfirmOpen(false) })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
