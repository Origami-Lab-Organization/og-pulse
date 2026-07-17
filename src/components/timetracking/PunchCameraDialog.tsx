import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Loader2, RotateCcw, SkipForward, Check, ScanFace, ShieldAlert } from 'lucide-react';
import { computeFaceDescriptor, compareFaceDescriptors, FACE_MATCH_THRESHOLD } from '@/lib/faceRecognition';
import { fetchFaceDescriptor } from '@/hooks/useFaceProfile';

export type FaceMatchStatus = 'confirmado' | 'nao_confirmado' | 'sem_verificacao';

export interface PunchConfirmResult {
  selfieBlob: Blob | null;
  faceMatchStatus: FaceMatchStatus;
  faceMatchScore: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  punchLabel: string;
  required: boolean;
  busy: boolean;
  employeeId: string | undefined;
  hasFaceProfile: boolean;
  onConfirm: (result: PunchConfirmResult) => void;
}

export function PunchCameraDialog({ open, onOpenChange, punchLabel, required, busy, employeeId, hasFaceProfile, onConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) return;

    setCameraError(null);
    setCapturedBlob(null);
    setCapturedUrl(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este dispositivo/navegador não suporta captura de câmera.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraError('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
      });

    return () => stopCamera();
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      'image/jpeg',
      0.8,
    );
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError('Não foi possível acessar a câmera. Verifique a permissão do navegador.'));
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) stopCamera();
    onOpenChange(nextOpen);
  };

  const handleConfirmWithPhoto = async () => {
    if (!hasFaceProfile || !employeeId || !imgRef.current) {
      onConfirm({ selfieBlob: capturedBlob, faceMatchStatus: 'sem_verificacao', faceMatchScore: null });
      return;
    }

    setVerifying(true);
    try {
      const [capturedDescriptor, storedDescriptor] = await Promise.all([
        computeFaceDescriptor(imgRef.current),
        fetchFaceDescriptor(employeeId),
      ]);

      if (!capturedDescriptor || !storedDescriptor) {
        onConfirm({ selfieBlob: capturedBlob, faceMatchStatus: 'nao_confirmado', faceMatchScore: null });
        return;
      }

      const distance = await compareFaceDescriptors(capturedDescriptor, storedDescriptor);
      const faceMatchStatus: FaceMatchStatus = distance <= FACE_MATCH_THRESHOLD ? 'confirmado' : 'nao_confirmado';
      onConfirm({ selfieBlob: capturedBlob, faceMatchStatus, faceMatchScore: distance });
    } catch {
      // Falha na verificação nunca bloqueia o ponto — só fica sem confirmação, para revisão.
      onConfirm({ selfieBlob: capturedBlob, faceMatchStatus: 'nao_confirmado', faceMatchScore: null });
    } finally {
      setVerifying(false);
    }
  };

  const busyOrVerifying = busy || verifying;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar {punchLabel}</DialogTitle>
          <DialogDescription>
            {hasFaceProfile
              ? 'Sua identidade será verificada localmente pelo reconhecimento facial ao confirmar.'
              : required
                ? 'Sua empresa exige uma selfie para confirmar a marcação.'
                : 'Tire uma selfie para confirmar a marcação (opcional).'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {cameraError ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{cameraError}</p>
          ) : capturedUrl ? (
            <img ref={imgRef} src={capturedUrl} alt="Selfie capturada" className="aspect-square w-full rounded-md object-cover" />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="aspect-square w-full rounded-md bg-muted object-cover" />
          )}

          {!cameraError && !capturedUrl && (
            <Button onClick={handleCapture} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Capturar
            </Button>
          )}

          {capturedUrl && (
            <Button variant="outline" onClick={handleRetake} disabled={busyOrVerifying} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Tirar novamente
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {capturedUrl ? (
            <Button disabled={busyOrVerifying} className="w-full" onClick={handleConfirmWithPhoto}>
              {busyOrVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : hasFaceProfile ? (
                <ScanFace className="mr-2 h-4 w-4" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {verifying ? 'Verificando identidade...' : 'Confirmar marcação'}
            </Button>
          ) : (
            <Button
              variant={cameraError || !required ? 'default' : 'ghost'}
              disabled={busyOrVerifying}
              className="w-full"
              onClick={() => onConfirm({ selfieBlob: null, faceMatchStatus: 'sem_verificacao', faceMatchScore: null })}
            >
              {busyOrVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
              {cameraError ? 'Continuar sem selfie' : required ? 'Pular mesmo assim' : 'Pular selfie e confirmar'}
            </Button>
          )}
        </DialogFooter>

        {!cameraError && !capturedUrl && hasFaceProfile && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            Mesmo que o reconhecimento não confirme sua identidade, a marcação será registrada normalmente.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
